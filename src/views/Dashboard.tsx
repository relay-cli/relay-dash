import {Text, useApp, useInput} from 'ink';
import {relayTheme} from '../theme.js';
import type {ShellTheme} from '../theme.js';
import {Frame} from './Frame.js';

export interface DashboardProps {
  theme?: ShellTheme;
  /** Fixed size, mainly for tests and snapshots. Defaults to the terminal size. */
  width?: number;
  height?: number;
  /** Read the keyboard. Disable it to print a single frame. */
  interactive?: boolean;
}

const QuitKey = () => {
  const {exit} = useApp();
  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) exit();
  });
  return null;
};

export const Dashboard = ({
  theme = relayTheme,
  width,
  height,
  interactive = true,
}: DashboardProps) => (
  <Frame
    title="Relay Dash"
    theme={theme}
    {...(width === undefined ? {} : {width})}
    {...(height === undefined ? {} : {height})}
    footer={<Text color={theme.muted}>q quit</Text>}
  >
    {interactive ? <QuitKey /> : null}
    <Text color={theme.muted}>No sources are configured yet.</Text>
  </Frame>
);
