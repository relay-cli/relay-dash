import type {ReactNode} from 'react';
import {Box, Text, useWindowSize} from 'ink';
import {relayTheme} from '../theme.js';
import type {ShellTheme} from '../theme.js';

export interface FrameProps {
  title: string;
  subtitle?: string;
  theme?: ShellTheme;
  /** Fixed width in columns. Defaults to the terminal width. */
  width?: number;
  /** Fixed height in rows. Defaults to the terminal height. */
  height?: number;
  /** Content pinned to the bottom row, usually a status bar. */
  footer?: ReactNode;
  children?: ReactNode;
}

/**
 * The outer chrome of a full-screen application: a title row, a flexible body
 * that fills the terminal, and an optional footer.
 */
export const Frame = ({
  title,
  subtitle,
  theme = relayTheme,
  width,
  height,
  footer,
  children,
}: FrameProps) => {
  const size = useWindowSize();
  const columns = Math.max(1, width ?? size.columns);
  const rows = Math.max(1, height ?? size.rows);
  return (
    <Box width={columns} height={rows} flexDirection="column" overflow="hidden">
      <Box flexShrink={0} justifyContent="space-between">
        <Text wrap="truncate-end">
          <Text color={theme.accent}>▌</Text>
          <Text bold color={theme.text}>
            {' '}
            {title}
          </Text>
          {subtitle === undefined ? null : <Text color={theme.muted}> · {subtitle}</Text>}
        </Text>
      </Box>
      <Box flexGrow={1} flexDirection="column" overflow="hidden">
        {children}
      </Box>
      {footer === undefined ? null : (
        <Box flexShrink={0} flexDirection="column">
          {footer}
        </Box>
      )}
    </Box>
  );
};
