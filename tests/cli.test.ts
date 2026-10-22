import {execFile} from 'node:child_process';
import {createServer} from 'node:net';
import type {AddressInfo} from 'node:net';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {describe, expect, it} from 'vitest';

const run = promisify(execFile);
const cli = fileURLToPath(new URL('../src/cli.tsx', import.meta.url));
const tsx = fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url));

/** A local port that nothing is listening on. */
const closedPort = async (): Promise<number> => {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const {port} = server.address() as AddressInfo;
  await new Promise((resolve) => server.close(resolve));
  return port;
};

describe('relay-dash command', () => {
  it('prints a snapshot of the dashboard without a terminal', async () => {
    const port = await closedPort();
    const {stdout} = await run(process.execPath, [
      tsx,
      cli,
      '--snapshot',
      '--no-sentinel',
      '--service',
      `inference=http://127.0.0.1:${port}`,
    ]);
    expect(stdout).toContain('Relay Dash');
    expect(stdout).toContain('q quit');
    expect(stdout).toMatch(/× inference\s+connection refused/);
  }, 30_000);

  it('prints the version', async () => {
    const {stdout} = await run(process.execPath, [tsx, cli, '--version']);
    expect(stdout.trim()).toBe('0.1.0');
  }, 30_000);

  it('exits with usage on an unknown option', async () => {
    await expect(run(process.execPath, [tsx, cli, '--nope'])).rejects.toMatchObject({code: 2});
  }, 30_000);
});
