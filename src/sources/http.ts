export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface RequestOptions {
  fetch?: Fetch;
  /** Abort a request that takes longer than this. Defaults to 3 seconds. */
  timeoutMs?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface HttpResult {
  status: number;
  body: string;
  latencyMs: number;
}

/** Join a base address and a path without doubling or dropping the slash. */
export const joinUrl = (base: string, path: string): string =>
  `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

/**
 * GET a URL and return the status and body. Network failures and timeouts
 * throw; HTTP error statuses do not, because health endpoints use 503 to say
 * "not ready".
 */
export const get = async (url: string, options: RequestOptions = {}): Promise<HttpResult> => {
  const fetch_ = options.fetch ?? fetch;
  const timeout = AbortSignal.timeout(options.timeoutMs ?? 3000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const started = performance.now();
  const response = await fetch_(url, {
    headers: {accept: 'application/json, text/plain;q=0.9', ...options.headers},
    signal,
  });
  const body = await response.text();
  return {status: response.status, body, latencyMs: Math.round(performance.now() - started)};
};

export class HttpError extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
  ) {
    super(`${url} answered ${status}`);
    this.name = 'HttpError';
  }
}

/** GET a URL that must answer 2xx with JSON. */
export const getJson = async (url: string, options: RequestOptions = {}): Promise<unknown> => {
  const result = await get(url, options);
  if (result.status < 200 || result.status >= 300) throw new HttpError(url, result.status);
  return JSON.parse(result.body) as unknown;
};

/** Describe a failed request in a few words suitable for a dashboard cell. */
export const describeError = (error: unknown): string => {
  if (error instanceof HttpError) return `HTTP ${error.status}`;
  if (error instanceof DOMException && error.name === 'TimeoutError') return 'timed out';
  if (error instanceof SyntaxError) return 'invalid JSON';
  if (error instanceof Error) {
    const cause = (error as Error & {cause?: unknown}).cause;
    if (cause && typeof cause === 'object' && 'code' in cause && typeof cause.code === 'string') {
      if (cause.code === 'ECONNREFUSED') return 'connection refused';
      if (cause.code === 'ENOTFOUND') return 'host not found';
      return cause.code;
    }
    return error.message;
  }
  return String(error);
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
