import {describe, expect, it} from 'vitest';
import {checkSentinel} from '../src/sources/sentinel.js';
import {fakeFetch, refused} from './helpers/fake-fetch.js';

const base = 'http://127.0.0.1:7331/api/v1';

const incident = (id: string, severity: string, status: string, updatedAt: string) => ({
  id,
  key: `key-${id}`,
  title: `Incident ${id}`,
  summary: 'summary',
  severity,
  status,
  host: 'den',
  ruleId: 'ssh-bruteforce',
  signalIds: ['a', 'b'],
  createdAt: '2026-10-21T10:00:00.000Z',
  updatedAt,
});

const routes = {
  [`${base}/health`]: {body: {ok: true, signals: 42, incidents: 7}},
  [`${base}/state`]: {body: {running: ['ssh-guard'], scheduled: 3}},
  [`${base}/incidents?status=open&limit=500`]: {
    body: {
      items: [
        incident('1', 'medium', 'open', '2026-10-21T12:00:00.000Z'),
        incident('2', 'critical', 'open', '2026-10-21T11:00:00.000Z'),
      ],
    },
  },
  [`${base}/incidents?status=acknowledged&limit=500`]: {
    body: {items: [incident('3', 'medium', 'acknowledged', '2026-10-21T13:00:00.000Z')]},
  },
  [`${base}/signals?limit=20`]: {
    body: {
      items: [
        {
          id: 's1',
          source: 'ssh-guard',
          kind: 'auth.failure',
          title: 'Failed password',
          summary: 'x',
          severity: 'high',
          host: 'den',
          observedAt: '2026-10-21T13:01:00.000Z',
          receivedAt: '2026-10-21T13:01:01.000Z',
          evidence: {},
          tags: [],
          fingerprint: 'f',
        },
      ],
    },
  },
};

describe('checkSentinel', () => {
  it('reads health, state, active incidents, and recent signals', async () => {
    const fake = fakeFetch(routes);
    const result = await checkSentinel({url: 'http://127.0.0.1:7331'}, {fetch: fake.fetch});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const snapshot = result.snapshot;
    expect(snapshot).toMatchObject({
      ok: true,
      signalTotal: 42,
      incidentTotal: 7,
      running: ['ssh-guard'],
      scheduled: 3,
    });
    expect(snapshot.incidents.map((item) => item.id)).toEqual(['2', '3', '1']);
    expect(snapshot.incidents[0]).toMatchObject({severity: 'critical', signalCount: 2});
    expect(snapshot.signals).toEqual([
      {
        id: 's1',
        source: 'ssh-guard',
        kind: 'auth.failure',
        title: 'Failed password',
        severity: 'high',
        host: 'den',
        observedAt: '2026-10-21T13:01:00.000Z',
      },
    ]);
  });

  it('sends the API token as a bearer token', async () => {
    const fake = fakeFetch(routes);
    await checkSentinel({url: 'http://127.0.0.1:7331/', token: 'secret'}, {fetch: fake.fetch});
    expect(fake.calls).toHaveLength(5);
    for (const call of fake.calls) {
      expect(call.url.startsWith(base)).toBe(true);
      expect(call.headers.authorization).toBe('Bearer secret');
    }
  });

  it('sends no authorization header without a token', async () => {
    const fake = fakeFetch(routes);
    await checkSentinel({url: 'http://127.0.0.1:7331'}, {fetch: fake.fetch});
    expect(fake.calls.every((call) => call.headers.authorization === undefined)).toBe(true);
  });

  it('reports a rejected token', async () => {
    const fake = fakeFetch({...routes, [`${base}/health`]: {status: 401, body: {}}});
    const result = await checkSentinel({url: 'http://127.0.0.1:7331'}, {fetch: fake.fetch});
    expect(result).toMatchObject({ok: false, error: 'HTTP 401'});
  });

  it('reports an unreachable server', async () => {
    const fake = fakeFetch({[`${base}/health`]: refused()});
    const result = await checkSentinel({url: 'http://127.0.0.1:7331'}, {fetch: fake.fetch});
    expect(result).toMatchObject({ok: false, error: 'connection refused'});
  });

  it('tolerates unknown severities and missing fields', async () => {
    const fake = fakeFetch({
      ...routes,
      [`${base}/incidents?status=open&limit=500`]: {
        body: {items: [{id: 'x', severity: 'apocalyptic'}, {title: 'no id'}]},
      },
      [`${base}/incidents?status=acknowledged&limit=500`]: {body: {}},
    });
    const result = await checkSentinel({url: 'http://127.0.0.1:7331'}, {fetch: fake.fetch});
    if (!result.ok) throw new Error(result.error);
    expect(result.snapshot.incidents).toEqual([
      expect.objectContaining({id: 'x', severity: 'info', status: 'open', title: '(untitled)'}),
    ]);
  });
});
