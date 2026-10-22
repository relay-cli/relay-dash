import {describe, expect, it} from 'vitest';
import {checkService, parseModels} from '../src/sources/services.js';
import {fakeFetch, refused} from './helpers/fake-fetch.js';

const url = 'http://127.0.0.1:8080';

const inferenceMetrics = `# HELP impossible_requests_total Completed requests.
# TYPE impossible_requests_total counter
impossible_requests_total{operation="chat",outcome="ok"} 12
# TYPE impossible_queue_depth gauge
impossible_queue_depth 3
# TYPE impossible_active_requests gauge
impossible_active_requests 2
`;

describe('checkService', () => {
  it('reads health, models, and queue metrics from an impossibleG service', async () => {
    const fake = fakeFetch({
      [`${url}/health/live`]: {body: {status: 'live'}},
      [`${url}/health/ready`]: {body: {status: 'ready'}},
      [`${url}/v1/models`]: {
        body: {
          object: 'list',
          data: [{id: 'qwen3-8b', object: 'model', owned_by: 'local'}],
          status: 'loaded',
        },
      },
      [`${url}/metrics`]: {body: inferenceMetrics},
    });
    const status = await checkService({name: 'inference', url}, {fetch: fake.fetch});
    expect(status).toMatchObject({
      name: 'inference',
      reachable: true,
      live: true,
      ready: true,
      models: [{id: 'qwen3-8b', state: 'loaded'}],
      queueDepth: 3,
      active: 2,
    });
    expect(status.reason).toBeUndefined();
  });

  it('reports why a live service is not ready', async () => {
    const fake = fakeFetch({
      [`${url}/health/live`]: {body: {status: 'live'}},
      [`${url}/health/ready`]: {status: 503, body: {status: 'not_ready', reason: 'model_loading'}},
      [`${url}/v1/models`]: {body: {object: 'list', data: [], status: 'not_ready'}},
    });
    const status = await checkService({name: 'inference', url}, {fetch: fake.fetch});
    expect(status).toMatchObject({live: true, ready: false, reason: 'model_loading', models: []});
    expect(status.queueDepth).toBeUndefined();
  });

  it('falls back to /healthz and /readyz', async () => {
    const mcp = 'http://127.0.0.1:3333';
    const fake = fakeFetch({
      [`${mcp}/healthz`]: {body: 'ok'},
      [`${mcp}/readyz`]: {body: 'ok'},
    });
    const status = await checkService({name: 'mcp', url: mcp}, {fetch: fake.fetch});
    expect(status).toMatchObject({reachable: true, live: true, ready: true});
    expect(status.models).toBeUndefined();
  });

  it('marks an unreachable service', async () => {
    const fake = fakeFetch({[`${url}/health/live`]: refused()});
    const status = await checkService({name: 'voice', url}, {fetch: fake.fetch});
    expect(status).toMatchObject({
      reachable: false,
      live: false,
      ready: false,
      reason: 'connection refused',
    });
  });

  it('sums service-specific active request gauges', async () => {
    const fake = fakeFetch({
      [`${url}/health/live`]: {body: {status: 'live'}},
      [`${url}/health/ready`]: {body: {status: 'ready'}},
      [`${url}/metrics`]: {
        body: 'impossible_queue_depth 0\nimpossible_ocr_active_requests 4\nimpossible_ocr_completed_requests 9\n',
      },
    });
    const status = await checkService({name: 'ocr', url}, {fetch: fake.fetch});
    expect(status).toMatchObject({queueDepth: 0, active: 4});
  });
});

describe('parseModels', () => {
  it('reads OpenAI-style lists with per-model status', () => {
    expect(
      parseModels({
        object: 'list',
        ready: true,
        data: [
          {id: 'impossible-voice-stt', status: 'ready'},
          {id: 'impossible-voice-tts', status: 'ready'},
        ],
      }),
    ).toEqual([
      {id: 'impossible-voice-stt', state: 'ready'},
      {id: 'impossible-voice-tts', state: 'ready'},
    ]);
  });

  it('reads the embeddings shape', () => {
    expect(
      parseModels({
        data: [
          {model: 'bge-small-en', state: 'ready'},
          {model: 'e5', state: 'missing'},
        ],
      }),
    ).toEqual([
      {id: 'bge-small-en', state: 'ready'},
      {id: 'e5', state: 'missing'},
    ]);
  });

  it('reads the OCR shape', () => {
    expect(parseModels({state: 'ready', models: ['paddle-v4']})).toEqual([
      {id: 'paddle-v4', state: 'ready'},
    ]);
  });

  it('returns undefined for anything else', () => {
    expect(parseModels({hello: 'world'})).toBeUndefined();
    expect(parseModels('nope')).toBeUndefined();
  });
});
