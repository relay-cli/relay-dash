import type {Fetch} from '../../src/sources/http.js';

export type Route = {status?: number; body?: unknown} | Error;

export interface FakeFetch {
  fetch: Fetch;
  /** Every request made, with its headers. */
  calls: {url: string; headers: Record<string, string>}[];
}

/** A fetch that answers from a table of URLs. Unknown URLs answer 404. */
export const fakeFetch = (routes: Record<string, Route>): FakeFetch => {
  const calls: FakeFetch['calls'] = [];
  const fetch: Fetch = (input, init) => {
    calls.push({url: input, headers: {...(init?.headers as Record<string, string> | undefined)}});
    const route = routes[input];
    if (route instanceof Error) return Promise.reject(route);
    const status = route?.status ?? (route ? 200 : 404);
    const body = route?.body ?? {error: 'not found'};
    return Promise.resolve(
      new Response(typeof body === 'string' ? body : JSON.stringify(body), {status}),
    );
  };
  return {fetch, calls};
};

export const refused = (): Error =>
  Object.assign(new TypeError('fetch failed'), {cause: {code: 'ECONNREFUSED'}});
