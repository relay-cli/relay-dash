import type {DashConfig} from '../config.js';
import type {RequestOptions} from './http.js';
import {checkSentinel} from './sentinel.js';
import type {SentinelResult} from './sentinel.js';
import {checkService} from './services.js';
import type {ServiceStatus} from './services.js';

export interface DashboardData {
  /** Undefined when pack-sentinel is not configured. */
  sentinel?: SentinelResult;
  services: ServiceStatus[];
}

/** Check every configured source once, in parallel. Never throws. */
export const pollOnce = async (
  config: DashConfig,
  options: RequestOptions = {},
): Promise<DashboardData> => {
  const [sentinel, services] = await Promise.all([
    config.sentinel ? checkSentinel(config.sentinel, options) : Promise.resolve(undefined),
    Promise.all(config.services.map((service) => checkService(service, options))),
  ]);
  return sentinel === undefined ? {services} : {sentinel, services};
};
