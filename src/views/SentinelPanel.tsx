import {Box, Text} from 'ink';
import type {SentinelResult, Severity} from '../sources/sentinel.js';
import {ago, cell, clean, fit} from '../text.js';
import type {ShellTheme} from '../theme.js';

export interface SentinelPanelProps {
  result?: SentinelResult;
  /** Undefined means pack-sentinel is not configured. */
  url?: string;
  width: number;
  /** Rows available for the whole panel, including its heading. */
  height: number;
  theme: ShellTheme;
  now: Date;
}

const severityLabel: Record<Severity, string> = {
  critical: 'CRIT',
  high: 'HIGH',
  medium: 'MED',
  low: 'LOW',
  info: 'INFO',
};

export const severityColor = (severity: Severity, theme: ShellTheme): string => {
  if (severity === 'critical' || severity === 'high') return theme.danger;
  if (severity === 'medium') return theme.warning;
  return theme.muted;
};

const Heading = ({theme, children}: {theme: ShellTheme; children: string}) => (
  <Text bold color={theme.accent}>
    {children}
  </Text>
);

export const SentinelPanel = ({result, url, width, height, theme, now}: SentinelPanelProps) => {
  if (url === undefined) {
    return (
      <Box flexDirection="column" width={width}>
        <Heading theme={theme}>PACK-SENTINEL</Heading>
        <Text color={theme.muted}>Not configured.</Text>
      </Box>
    );
  }
  if (result === undefined) {
    return (
      <Box flexDirection="column" width={width}>
        <Heading theme={theme}>PACK-SENTINEL</Heading>
        <Text color={theme.muted}>{fit(`Connecting to ${url}…`, width)}</Text>
      </Box>
    );
  }
  if (!result.ok) {
    return (
      <Box flexDirection="column" width={width}>
        <Heading theme={theme}>PACK-SENTINEL</Heading>
        <Text color={theme.danger}>{fit(`× ${url}: ${clean(result.error)}`, width)}</Text>
      </Box>
    );
  }

  const {snapshot} = result;
  const collecting =
    snapshot.running.length > 0 ? ` · collecting ${snapshot.running.join(', ')}` : '';
  const summary = `${snapshot.signalTotal} signals · ${snapshot.incidentTotal} incidents${collecting}`;
  // Heading, summary, two section titles, and a spacer leave the rest for rows.
  const rows = Math.max(0, height - 5);
  const incidentRows = Math.min(
    snapshot.incidents.length,
    Math.max(Math.ceil(rows * 0.6), rows - snapshot.signals.length),
  );
  const signalRows = Math.max(0, Math.min(snapshot.signals.length, rows - incidentRows));
  const hiddenIncidents = snapshot.incidents.length - incidentRows;
  const titleWidth = Math.max(8, width - 26);

  return (
    <Box flexDirection="column" width={width}>
      <Heading theme={theme}>PACK-SENTINEL</Heading>
      <Text wrap="truncate-end">
        <Text color={snapshot.ok ? theme.success : theme.danger}>● </Text>
        <Text color={theme.text}>{summary}</Text>
      </Text>
      <Text> </Text>
      <Text color={theme.text} wrap="truncate-end">
        Incidents{' '}
        <Text color={theme.muted}>
          {snapshot.incidents.length === 0
            ? 'none active'
            : `${snapshot.incidents.length} active${hiddenIncidents > 0 ? `, ${hiddenIncidents} not shown` : ''}`}
        </Text>
      </Text>
      {snapshot.incidents.slice(0, incidentRows).map((incident) => (
        <Text key={incident.id} wrap="truncate-end">
          <Text color={severityColor(incident.severity, theme)}>
            {cell(severityLabel[incident.severity], 5)}
          </Text>
          <Text color={incident.status === 'open' ? theme.text : theme.muted}>
            {cell(incident.status === 'open' ? 'open' : 'ack', 5)}
          </Text>
          <Text color={theme.muted}>{cell(clean(incident.host), 10)}</Text>
          <Text color={theme.text}>{cell(clean(incident.title), titleWidth)}</Text>
          <Text color={theme.muted}> {ago(incident.updatedAt, now).padStart(4)}</Text>
        </Text>
      ))}
      <Text color={theme.text}>
        Recent signals{' '}
        {snapshot.signals.length === 0 ? <Text color={theme.muted}>none</Text> : null}
      </Text>
      {snapshot.signals.slice(0, signalRows).map((signal) => (
        <Text key={signal.id} wrap="truncate-end">
          <Text color={severityColor(signal.severity, theme)}>
            {cell(severityLabel[signal.severity], 5)}
          </Text>
          <Text color={theme.muted}>{cell(clean(signal.source), 15)}</Text>
          <Text color={theme.text}>{cell(clean(signal.title), Math.max(8, width - 26))}</Text>
          <Text color={theme.muted}> {ago(signal.observedAt, now).padStart(4)}</Text>
        </Text>
      ))}
    </Box>
  );
};
