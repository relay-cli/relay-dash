export interface CliOptions {
  help: boolean;
  version: boolean;
  inline: boolean;
  snapshot: boolean;
}

export const helpText = `Relay Dash

Usage:
  relay-dash
  relay-dash --snapshot

Options:
  --inline           Render in the current screen instead of the alternate screen
  --snapshot         Print one frame of the dashboard and exit
  -h, --help         Show this help
  -v, --version      Show the version
`;

export const parseCliOptions = (arguments_: readonly string[]): CliOptions => {
  const options: CliOptions = {help: false, version: false, inline: false, snapshot: false};
  for (const argument of arguments_) {
    if (argument === '-h' || argument === '--help') options.help = true;
    else if (argument === '-v' || argument === '--version') options.version = true;
    else if (argument === '--inline') options.inline = true;
    else if (argument === '--snapshot') options.snapshot = true;
    else throw new Error(`Unknown option: ${argument}`);
  }
  return options;
};
