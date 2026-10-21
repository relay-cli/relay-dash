import {execFile} from 'node:child_process';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

const run = promisify(execFile);
const cli = fileURLToPath(new URL('../src/cli.tsx', import.meta.url));
const tsx = fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url));

const responses: Record<string, [number, string]> = {
  '/health/live': [200, '{"status":"live"}'],
  '/health/ready': [200, '{"status":"ready"}'],
  '/v1/models': [200, '{"object":"list","data":[{"id":"qwen3-8b"}],"status":"loaded"}'],
  '/metrics': [200, 'impossible_queue_depth 1\nimpossible_active_requests 0\n'],
};

const server = createServer((request, response) => {
  const [status, body] = responses[request.url ?? ''] ?? [404, '{}'];
  response.writeHead(status).end(body);
});
let url = '';

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('relay-dash --json', () => {
  it('polls each source once and prints the results', async () => {
    const {stdout} = await run(process.execPath, [
      tsx,
      cli,
      '--json',
      '--no-sentinel',
      '--service',
      `inference=${url}`,
    ]);
    const data = JSON.parse(stdout) as {sentinel?: unknown; services: unknown[]};
    expect(data.sentinel).toBeUndefined();
    expect(data.services).toEqual([
      expect.objectContaining({
        name: 'inference',
        ready: true,
        models: [{id: 'qwen3-8b', state: 'loaded'}],
        queueDepth: 1,
        active: 0,
      }),
    ]);
  }, 30_000);

  it('exits 1 when a source is down', async () => {
    await expect(
      run(process.execPath, [tsx, cli, '--json', '--sentinel', `${url}/nothing-here`]),
    ).rejects.toMatchObject({code: 1});
  }, 30_000);

  it('exits 2 on an invalid source', async () => {
    await expect(
      run(process.execPath, [tsx, cli, '--json', '--service', 'broken']),
    ).rejects.toMatchObject({code: 2});
  }, 30_000);
});
