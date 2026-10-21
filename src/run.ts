import type {ReactNode} from 'react';
import {render} from 'ink';

export interface RunDashboardOptions {
  /** Render on the terminal's alternate screen and restore the scrollback on exit. */
  alternateScreen?: boolean;
  /** Let Ink exit on Ctrl+C. The dashboard binds Ctrl+C itself. */
  exitOnCtrlC?: boolean;
  stdout?: NodeJS.WriteStream;
  stdin?: NodeJS.ReadStream;
}

/**
 * Render a full-screen application and resolve once it exits, either through
 * `useApp().exit()` or an interrupt signal.
 */
export const runDashboard = async (
  node: ReactNode,
  options: RunDashboardOptions = {},
): Promise<void> => {
  const app = render(node, {
    alternateScreen: options.alternateScreen ?? true,
    exitOnCtrlC: options.exitOnCtrlC ?? false,
    ...(options.stdout === undefined ? {} : {stdout: options.stdout}),
    ...(options.stdin === undefined ? {} : {stdin: options.stdin}),
  });
  const interrupt = (): void => app.unmount();
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    await app.waitUntilExit();
  } finally {
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', interrupt);
  }
};
