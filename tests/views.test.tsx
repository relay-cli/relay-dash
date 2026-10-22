import React from 'react';
import {render} from 'ink-testing-library';
import {describe, expect, it} from 'vitest';
import type {DashConfig} from '../src/config.js';
import type {DashboardData} from '../src/sources/poll.js';
import type {SentinelIncident} from '../src/sources/sentinel.js';
import {DashboardView} from '../src/views/Dashboard.js';

const now = new Date('2026-10-21T13:10:00.000Z');
const checkedAt = new Date('2026-10-21T13:09:57.000Z');

const config: DashConfig = {
  sentinel: {url: 'http://127.0.0.1:7331'},
  services: [
    {name: 'inference', url: 'http://127.0.0.1:8080'},
    {name: 'ocr', url: 'http://127.0.0.1:8082'},
    {name: 'voice', url: 'http://127.0.0.1:8083'},
  ],
  intervalSeconds: 5,
};

const incident = (id: string, overrides: Partial<SentinelIncident> = {}): SentinelIncident => ({
  id,
  title: `Incident ${id}`,
  summary: '',
  severity: 'medium',
  status: 'open',
  host: 'den',
  ruleId: 'rule',
  signalCount: 1,
  createdAt: '2026-10-21T13:00:00.000Z',
  updatedAt: '2026-10-21T13:05:00.000Z',
  ...overrides,
});

const data: DashboardData = {
  sentinel: {
    ok: true,
    checkedAt,
    snapshot: {
      ok: true,
      signalTotal: 42,
      incidentTotal: 7,
      running: ['ssh-guard'],
      scheduled: 3,
      incidents: [
        incident('1', {severity: 'critical', title: 'SSH brute force from 203.0.113.9'}),
        incident('2', {status: 'acknowledged', title: 'Open port 2375'}),
      ],
      signals: [
        {
          id: 's1',
          source: 'ssh-guard',
          kind: 'auth.failure',
          title: 'Failed password for root',
          severity: 'high',
          host: 'den',
          observedAt: '2026-10-21T13:09:00.000Z',
        },
      ],
      latencyMs: 4,
    },
  },
  services: [
    {
      name: 'inference',
      url: 'http://127.0.0.1:8080',
      reachable: true,
      live: true,
      ready: true,
      models: [{id: 'qwen3-8b', state: 'loaded'}],
      queueDepth: 3,
      active: 2,
      checkedAt,
    },
    {
      name: 'ocr',
      url: 'http://127.0.0.1:8082',
      reachable: true,
      live: true,
      ready: false,
      reason: 'model_loading',
      models: [],
      checkedAt,
    },
    {
      name: 'voice',
      url: 'http://127.0.0.1:8083',
      reachable: false,
      live: false,
      ready: false,
      reason: 'connection refused',
      checkedAt,
    },
  ],
};

const frame = (element: React.ReactElement): string => render(element).lastFrame() ?? '';

describe('DashboardView', () => {
  it('shows each service with its state, queue, and models', () => {
    const output = frame(
      <DashboardView config={config} data={data} width={100} height={24} now={now} />,
    );
    expect(output).toContain('Relay Dash · updated 3s ago');
    expect(output).toContain('SERVICES 1/3 ready');
    expect(output).toMatch(/● inference\s+ready\s+3\s+2\s+qwen3-8b/);
    expect(output).toMatch(/○ ocr\s+model_loading\s+–\s+–\s+no models/);
    expect(output).toMatch(/× voice\s+connection refused/);
  });

  it('shows pack-sentinel incidents and signals', () => {
    const output = frame(
      <DashboardView config={config} data={data} width={100} height={24} now={now} />,
    );
    expect(output).toContain('42 signals · 7 incidents · collecting ssh-guard');
    expect(output).toContain('Incidents 2 active');
    expect(output).toMatch(/CRIT\s+open\s+den\s+SSH brute force from 203\.0\.113\.9\s+5m/);
    expect(output).toMatch(/MED\s+ack\s+den\s+Open port 2375/);
    expect(output).toMatch(/HIGH\s+ssh-guard\s+Failed password for root\s+1m/);
    expect(output).toContain('q quit · r refresh · every 5s');
  });

  it('fills exactly the requested size', () => {
    const lines = frame(
      <DashboardView config={config} data={data} width={60} height={12} now={now} />,
    ).split('\n');
    expect(lines).toHaveLength(12);
    expect(lines.every((line) => line.length <= 60)).toBe(true);
  });

  it('says how many incidents did not fit', () => {
    const many = Array.from({length: 30}, (_, index) => incident(String(index)));
    const crowded: DashboardData = {
      ...data,
      sentinel: {
        ok: true,
        checkedAt,
        snapshot: {
          ...(data.sentinel?.ok ? data.sentinel.snapshot : ({} as never)),
          incidents: many,
        },
      },
    };
    const output = frame(
      <DashboardView config={config} data={crowded} width={100} height={20} now={now} />,
    );
    expect(output).toMatch(/Incidents 30 active, \d+ not shown/);
  });

  it('shows an unreachable pack-sentinel', () => {
    const output = frame(
      <DashboardView
        config={config}
        data={{...data, sentinel: {ok: false, checkedAt, error: 'HTTP 401'}}}
        width={100}
        height={24}
        now={now}
      />,
    );
    expect(output).toContain('× http://127.0.0.1:7331: HTTP 401');
  });

  it('waits for the first poll', () => {
    const output = frame(<DashboardView config={config} width={100} height={24} now={now} />);
    expect(output).toContain('waiting for the first poll');
    expect(output).toContain('· inference');
    expect(output).toContain('checking…');
    expect(output).toContain('Connecting to http://127.0.0.1:7331');
  });

  it('strips terminal control sequences from watched text', () => {
    const hostile: DashboardData = {
      services: [],
      sentinel: {
        ok: true,
        checkedAt,
        snapshot: {
          ...(data.sentinel?.ok ? data.sentinel.snapshot : ({} as never)),
          incidents: [incident('x', {title: 'evil\u001B[2J\u001B]0;pwned\u0007 title\nnext'})],
        },
      },
    };
    const output = frame(
      <DashboardView
        config={{...config, services: []}}
        data={hostile}
        width={100}
        height={24}
        now={now}
      />,
    );
    expect(output).toContain('evil title next');
    expect(output).not.toContain('pwned');
    expect(output).not.toContain('[2J');
  });

  it('notes when pack-sentinel is turned off', () => {
    const rest: DashConfig = {services: config.services, intervalSeconds: 5};
    const output = frame(
      <DashboardView config={rest} data={{services: data.services}} width={100} height={24} />,
    );
    expect(output).toContain('PACK-SENTINEL');
    expect(output).toContain('Not configured.');
  });
});
