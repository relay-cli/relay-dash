import {describeError, getJson, isRecord, joinUrl} from './http.js';
import type {RequestOptions} from './http.js';

export const severities = ['info', 'low', 'medium', 'high', 'critical'] as const;
export type Severity = (typeof severities)[number];
export type IncidentStatus = 'open' | 'acknowledged' | 'resolved' | 'suppressed';

export interface SentinelIncident {
  id: string;
  title: string;
  summary: string;
  severity: Severity;
  status: IncidentStatus;
  host: string;
  ruleId: string;
  signalCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SentinelSignal {
  id: string;
  source: string;
  kind: string;
  title: string;
  severity: Severity;
  host: string;
  observedAt: string;
}

export interface SentinelSnapshot {
  ok: boolean;
  /** Record counts from `/api/v1/health`. */
  signalTotal: number;
  incidentTotal: number;
  /** Collectors running right now and the number of scheduled timers. */
  running: string[];
  scheduled: number;
  /** Open and acknowledged incidents, most severe first, then most recent. */
  incidents: SentinelIncident[];
  /** The most recent signals, newest first. */
  signals: SentinelSignal[];
  latencyMs: number;
}

export type SentinelResult =
  | {ok: true; checkedAt: Date; snapshot: SentinelSnapshot}
  | {ok: false; checkedAt: Date; error: string};

export interface SentinelSource {
  url: string;
  /** Sent as `Authorization: Bearer <token>` when pack-sentinel has `apiToken` set. */
  token?: string;
}

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const asSeverity = (value: unknown): Severity =>
  severities.includes(value as Severity) ? (value as Severity) : 'info';

export const severityRank = (value: Severity): number => severities.indexOf(value);

const items = (value: unknown): unknown[] =>
  isRecord(value) && Array.isArray(value.items) ? value.items : [];

const toIncident = (value: unknown): SentinelIncident | undefined => {
  if (!isRecord(value) || typeof value.id !== 'string') return undefined;
  const status = asString(value.status, 'open');
  return {
    id: value.id,
    title: asString(value.title, '(untitled)'),
    summary: asString(value.summary),
    severity: asSeverity(value.severity),
    status: (['open', 'acknowledged', 'resolved', 'suppressed'].includes(status)
      ? status
      : 'open') as IncidentStatus,
    host: asString(value.host, 'localhost'),
    ruleId: asString(value.ruleId),
    signalCount: Array.isArray(value.signalIds) ? value.signalIds.length : 0,
    createdAt: asString(value.createdAt),
    updatedAt: asString(value.updatedAt),
  };
};

const toSignal = (value: unknown): SentinelSignal | undefined => {
  if (!isRecord(value) || typeof value.id !== 'string') return undefined;
  return {
    id: value.id,
    source: asString(value.source),
    kind: asString(value.kind),
    title: asString(value.title, '(untitled)'),
    severity: asSeverity(value.severity),
    host: asString(value.host, 'localhost'),
    observedAt: asString(value.observedAt),
  };
};

export const compareIncidents = (left: SentinelIncident, right: SentinelIncident): number =>
  severityRank(right.severity) - severityRank(left.severity) ||
  right.updatedAt.localeCompare(left.updatedAt);

const defined = <T>(value: T | undefined): value is T => value !== undefined;

/** Read health, collector state, active incidents, and recent signals from pack-sentinel. */
export const fetchSentinel = async (
  source: SentinelSource,
  options: RequestOptions & {signalLimit?: number} = {},
): Promise<SentinelSnapshot> => {
  const request: RequestOptions = {
    ...options,
    headers: {
      ...options.headers,
      ...(source.token ? {authorization: `Bearer ${source.token}`} : {}),
    },
  };
  const api = (path: string) => joinUrl(source.url, `/api/v1/${path}`);
  const started = performance.now();
  const [health, state, open, acknowledged, signals] = await Promise.all([
    getJson(api('health'), request),
    getJson(api('state'), request),
    getJson(api('incidents?status=open&limit=500'), request),
    getJson(api('incidents?status=acknowledged&limit=500'), request),
    getJson(api(`signals?limit=${options.signalLimit ?? 20}`), request),
  ]);
  const healthRecord = isRecord(health) ? health : {};
  const stateRecord = isRecord(state) ? state : {};
  return {
    ok: healthRecord.ok === true,
    signalTotal: asNumber(healthRecord.signals),
    incidentTotal: asNumber(healthRecord.incidents),
    running: Array.isArray(stateRecord.running)
      ? stateRecord.running.filter((name): name is string => typeof name === 'string')
      : [],
    scheduled: asNumber(stateRecord.scheduled),
    incidents: [...items(open), ...items(acknowledged)]
      .map(toIncident)
      .filter(defined)
      .sort(compareIncidents),
    signals: items(signals).map(toSignal).filter(defined),
    latencyMs: Math.round(performance.now() - started),
  };
};

/** Like `fetchSentinel`, but returns failures as data so a view can show them. */
export const checkSentinel = async (
  source: SentinelSource,
  options: RequestOptions & {signalLimit?: number} = {},
): Promise<SentinelResult> => {
  try {
    return {ok: true, checkedAt: new Date(), snapshot: await fetchSentinel(source, options)};
  } catch (error) {
    return {ok: false, checkedAt: new Date(), error: describeError(error)};
  }
};
