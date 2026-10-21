import {describeError, get, isRecord, joinUrl} from './http.js';
import type {HttpResult, RequestOptions} from './http.js';
import {parseMetrics, sumMetric} from './metrics.js';

export interface ServiceSource {
  /** A short label such as `inference` or `ocr`. */
  name: string;
  /** The service's HTTP address, for example `http://127.0.0.1:8080`. */
  url: string;
}

export interface ServiceModel {
  id: string;
  /** The service's own word for the model's state, such as `ready`, `loaded`, or `missing`. */
  state?: string;
}

export interface ServiceStatus {
  name: string;
  url: string;
  /** False when the service could not be reached at all. */
  reachable: boolean;
  live: boolean;
  ready: boolean;
  /** Why the service is not ready, in the service's own words, or the network error. */
  reason?: string;
  /** Undefined when the service has no model list. */
  models?: ServiceModel[];
  /** Requests waiting for a worker. Undefined when the service exports no queue metric. */
  queueDepth?: number;
  /** Requests being served now. */
  active?: number;
  latencyMs?: number;
  checkedAt: Date;
}

/** impossibleG services use `/health/*`; the MCP server and ReAct agent use `/healthz` and `/readyz`. */
const livePaths = ['/health/live', '/healthz'];
const readyPaths = ['/health/ready', '/readyz'];

const firstFound = async (
  base: string,
  paths: readonly string[],
  options: RequestOptions,
): Promise<HttpResult | undefined> => {
  for (const path of paths) {
    const result = await get(joinUrl(base, path), options);
    if (result.status !== 404) return result;
  }
  return undefined;
};

const parseJson = (body: string): unknown => {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return undefined;
  }
};

const readinessReason = (result: HttpResult): string | undefined => {
  const body = parseJson(result.body);
  if (isRecord(body)) {
    if (typeof body.reason === 'string') return body.reason;
    if (typeof body.status === 'string' && result.status >= 300) return body.status;
  }
  return result.status >= 300 ? `HTTP ${result.status}` : undefined;
};

/**
 * Read a model list in any of the shapes impossibleG services use:
 * OpenAI-style `{data: [{id}]}` (inference, voice), `{data: [{model, state}]}`
 * (embeddings), or `{state, models: ["id"]}` (OCR).
 */
export const parseModels = (value: unknown): ServiceModel[] | undefined => {
  if (!isRecord(value)) return undefined;
  if (Array.isArray(value.data)) {
    const fallbackState = typeof value.status === 'string' ? value.status : undefined;
    return value.data.flatMap((entry): ServiceModel[] => {
      if (!isRecord(entry)) return [];
      const id =
        typeof entry.id === 'string'
          ? entry.id
          : typeof entry.model === 'string'
            ? entry.model
            : undefined;
      if (id === undefined) return [];
      const state =
        typeof entry.state === 'string'
          ? entry.state
          : typeof entry.status === 'string'
            ? entry.status
            : fallbackState;
      return [state === undefined ? {id} : {id, state}];
    });
  }
  if (Array.isArray(value.models)) {
    const state = typeof value.state === 'string' ? value.state : undefined;
    return value.models.flatMap((entry): ServiceModel[] => {
      if (typeof entry === 'string')
        return [state === undefined ? {id: entry} : {id: entry, state}];
      if (isRecord(entry) && typeof entry.id === 'string') return [{id: entry.id}];
      return [];
    });
  }
  return undefined;
};

const optional = async <T>(work: Promise<T>): Promise<T | undefined> => {
  try {
    return await work;
  } catch {
    return undefined;
  }
};

/** Probe one impossibleG service: health, models, and queue metrics. */
export const checkService = async (
  source: ServiceSource,
  options: RequestOptions = {},
): Promise<ServiceStatus> => {
  const base = {name: source.name, url: source.url};
  let live: HttpResult | undefined;
  try {
    live = await firstFound(source.url, livePaths, options);
  } catch (error) {
    return {
      ...base,
      reachable: false,
      live: false,
      ready: false,
      reason: describeError(error),
      checkedAt: new Date(),
    };
  }
  const [ready, models, metrics] = await Promise.all([
    optional(firstFound(source.url, readyPaths, options)),
    optional(get(joinUrl(source.url, '/v1/models'), options)),
    optional(get(joinUrl(source.url, '/metrics'), options)),
  ]);
  const isLive = live !== undefined && live.status >= 200 && live.status < 300;
  const isReady = ready !== undefined && ready.status >= 200 && ready.status < 300;
  const reason =
    ready === undefined ? (isLive ? undefined : 'no health check') : readinessReason(ready);
  const modelList =
    models !== undefined && models.status === 200 ? parseModels(parseJson(models.body)) : undefined;
  const samples =
    metrics !== undefined && metrics.status === 200 ? parseMetrics(metrics.body) : undefined;
  const queueDepth = samples && sumMetric(samples, (name) => name === 'impossible_queue_depth');
  const active =
    samples &&
    sumMetric(
      samples,
      (name) => name.startsWith('impossible_') && name.endsWith('_active_requests'),
    );
  return {
    ...base,
    reachable: true,
    live: isLive,
    ready: isReady,
    ...(reason === undefined ? {} : {reason}),
    ...(modelList === undefined ? {} : {models: modelList}),
    ...(queueDepth === undefined ? {} : {queueDepth}),
    ...(active === undefined ? {} : {active}),
    ...(live === undefined ? {} : {latencyMs: live.latencyMs}),
    checkedAt: new Date(),
  };
};
