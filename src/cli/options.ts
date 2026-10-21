import type {ConfigOverrides} from '../config.js';

export interface CliOptions extends ConfigOverrides {
  help: boolean;
  version: boolean;
  inline: boolean;
  snapshot: boolean;
  json: boolean;
}

export const helpText = `Relay Dash

Usage:
  relay-dash [options]
  relay-dash --json

Sources:
  --config <path>       Read sources from a JSON file (default: ./relay-dash.json if present)
  --sentinel <url>      pack-sentinel address (default: http://127.0.0.1:7331)
  --no-sentinel         Do not poll pack-sentinel
  --service <name=url>  Watch an impossibleG service; repeat for several
  --interval <seconds>  Seconds between polls (default: 5)

Output:
  --json                Poll every source once, print the results as JSON, and exit
  --inline              Render in the current screen instead of the alternate screen
  --snapshot            Print one frame of the dashboard and exit
  -h, --help            Show this help
  -v, --version         Show the version

The pack-sentinel API token is read from RELAY_DASH_SENTINEL_TOKEN.
`;

const valueOptions = new Set(['--config', '--sentinel', '--service', '--interval']);

export const parseCliOptions = (arguments_: readonly string[]): CliOptions => {
  const options: CliOptions = {
    help: false,
    version: false,
    inline: false,
    snapshot: false,
    json: false,
  };
  for (let index = 0; index < arguments_.length; index++) {
    let argument = arguments_[index] ?? '';
    let value: string | undefined;
    const equals = argument.indexOf('=');
    if (argument.startsWith('--') && equals > 0) {
      value = argument.slice(equals + 1);
      argument = argument.slice(0, equals);
    }
    if (valueOptions.has(argument) && value === undefined) {
      value = arguments_[++index];
      if (value === undefined) throw new Error(`${argument} needs a value`);
    }
    if (argument === '-h' || argument === '--help') options.help = true;
    else if (argument === '-v' || argument === '--version') options.version = true;
    else if (argument === '--inline') options.inline = true;
    else if (argument === '--snapshot') options.snapshot = true;
    else if (argument === '--json') options.json = true;
    else if (argument === '--no-sentinel') options.noSentinel = true;
    else if (argument === '--config' && value !== undefined) options.configPath = value;
    else if (argument === '--sentinel' && value !== undefined) options.sentinelUrl = value;
    else if (argument === '--service' && value !== undefined)
      options.services = [...(options.services ?? []), value];
    else if (argument === '--interval' && value !== undefined) {
      const seconds = Number(value);
      if (!Number.isFinite(seconds)) throw new Error(`--interval expects seconds, got: ${value}`);
      options.intervalSeconds = seconds;
    } else throw new Error(`Unknown option: ${arguments_[index] ?? ''}`);
  }
  return options;
};
