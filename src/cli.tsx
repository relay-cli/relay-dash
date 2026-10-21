#!/usr/bin/env node

import {renderToString} from 'ink';
import {helpText, parseCliOptions} from './cli/options.js';
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
