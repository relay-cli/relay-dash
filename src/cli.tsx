#!/usr/bin/env node

import {renderToString} from 'ink';
import {helpText, parseCliOptions} from './cli/options.js';
import {ConfigError, loadConfig} from './config.js';
import {pollOnce} from './sources/poll.js';
import {runDashboard} from './run.js';
import {relayDashVersion} from './version.js';
import {Dashboard} from './views/Dashboard.js';

const main = async (): Promise<void> => {
  let options;
  try {
    options = parseCliOptions(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n\n${helpText}`,
    );
    process.exitCode = 2;
    return;
  }
  if (options.help) return void process.stdout.write(helpText);
  if (options.version) return void process.stdout.write(`${relayDashVersion}\n`);

  let config;
  try {
    config = await loadConfig(options);
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    process.stderr.write(`relay-dash: ${error.message}\n`);
    process.exitCode = 2;
    return;
  }

  if (options.json) {
    const data = await pollOnce(config);
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    const healthy =
      (data.sentinel === undefined || data.sentinel.ok) &&
      data.services.every((service) => service.ready);
    if (!healthy) process.exitCode = 1;
    return;
  }

  if (options.snapshot || !process.stdout.isTTY || !process.stdin.isTTY) {
    const columns = process.stdout.columns || 80;
    const frame = renderToString(<Dashboard width={columns} height={24} interactive={false} />, {
      columns,
    });
    process.stdout.write(`${frame}\n`);
    return;
  }

  await runDashboard(<Dashboard />, {alternateScreen: !options.inline});
};

await main();
