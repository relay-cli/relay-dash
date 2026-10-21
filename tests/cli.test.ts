import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {describe, expect, it} from 'vitest';

const run = promisify(execFile);
const cli = fileURLToPath(new URL('../src/cli.tsx', import.meta.url));
const tsx = fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url));

describe('relay-dash command', () => {
  it('prints a snapshot of the dashboard without a terminal', async () => {
    const {stdout} = await run(process.execPath, [tsx, cli, '--snapshot']);
    expect(stdout).toContain('Relay Dash');
    expect(stdout).toContain('q quit');
  }, 30_000);

  it('prints the version', async () => {
    const {stdout} = await run(process.execPath, [tsx, cli, '--version']);
    expect(stdout.trim()).toBe('0.1.0');
  }, 30_000);

  it('exits with usage on an unknown option', async () => {
    await expect(run(process.execPath, [tsx, cli, '--nope'])).rejects.toMatchObject({code: 2});
  }, 30_000);
});
