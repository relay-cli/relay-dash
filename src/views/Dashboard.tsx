import {useEffect, useState} from 'react';
import {Box, Text, useApp, useInput, useWindowSize} from 'ink';
import type {DashConfig} from '../config.js';
import {usePoll} from '../data/usePoll.js';
import type {RequestOptions} from '../sources/http.js';
import type {DashboardData} from '../sources/poll.js';
import {relayTheme} from '../theme.js';
import type {ShellTheme} from '../theme.js';
import {Frame} from './Frame.js';
import {SentinelPanel} from './SentinelPanel.js';
import {ServicesPanel} from './ServicesPanel.js';

export interface DashboardViewProps {
  config: DashConfig;
  /** The latest poll. Undefined until the first one finishes. */
  data?: DashboardData;
  polling?: boolean;
  theme?: ShellTheme;
  /** Fixed size, mainly for tests and snapshots. Defaults to the terminal size. */
  width?: number;
  height?: number;
  /** The clock used for "how long ago" labels. */
  now?: Date;
}

const lastChecked = (data: DashboardData | undefined): Date | undefined => {
  const times = [
    ...(data?.sentinel ? [data.sentinel.checkedAt] : []),
    ...(data?.services.map((service) => service.checkedAt) ?? []),
  ];
  return times.length === 0
    ? undefined
    : new Date(Math.max(...times.map((time) => time.getTime())));
};

/** The dashboard for one set of results. It does not poll; see `Dashboard`. */
export const DashboardView = ({
  config,
  data,
  polling = false,
  theme = relayTheme,
  width,
  height,
  now = new Date(),
}: DashboardViewProps) => {
  const size = useWindowSize();
  const columns = Math.max(20, width ?? size.columns);
  const rows = Math.max(8, height ?? size.rows);
  const names = config.services.map((service) => service.name);
  const checked = lastChecked(data);
  const age =
    checked === undefined
      ? 'waiting for the first poll'
      : `updated ${Math.max(0, Math.round((now.getTime() - checked.getTime()) / 1000))}s ago`;
  const servicesHeight = names.length === 0 ? 1 : names.length + 2;
  // Title row, footer row, and a spacer between the panels.
  const sentinelHeight = Math.max(2, rows - 3 - servicesHeight);
  return (
    <Frame
      title="Relay Dash"
      subtitle={polling ? 'polling…' : age}
      theme={theme}
      width={columns}
      height={rows}
      footer={
        <Text color={theme.muted} wrap="truncate-end">
          q quit · r refresh · every {config.intervalSeconds}s
        </Text>
      }
    >
      <ServicesPanel services={data?.services ?? []} names={names} width={columns} theme={theme} />
      <Box height={1} />
      <SentinelPanel
        {...(data?.sentinel === undefined ? {} : {result: data.sentinel})}
        {...(config.sentinel === undefined ? {} : {url: config.sentinel.url})}
        width={columns}
        height={sentinelHeight}
        theme={theme}
        now={now}
      />
    </Frame>
  );
};

export interface DashboardProps extends Omit<DashboardViewProps, 'data' | 'polling' | 'now'> {
  /** Passed to every request, for example a custom `fetch` or a timeout. */
  requestOptions?: Omit<RequestOptions, 'signal'>;
  /** Results to show before the first poll returns. */
  initialData?: DashboardData;
}

/** The live dashboard: polls every source, redraws, and reads `q` and `r`. */
export const Dashboard = ({initialData, requestOptions, ...props}: DashboardProps) => {
  const {exit} = useApp();
  const {data, polling, refresh} = usePoll(props.config, requestOptions, initialData);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);
  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) exit();
    else if (input === 'r') refresh();
  });
  return (
    <DashboardView {...props} {...(data === undefined ? {} : {data})} polling={polling} now={now} />
  );
};
