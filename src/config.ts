import {readFile} from 'node:fs/promises';
import {isRecord} from './sources/http.js';
import type {SentinelSource} from './sources/sentinel.js';
import type {ServiceSource} from './sources/services.js';

export interface DashConfig {
  /** Omitted when pack-sentinel is turned off with `"sentinel": false`. */
  sentinel?: SentinelSource;
  services: ServiceSource[];
  /** Seconds between polls. */
  intervalSeconds: number;
}

/** The token is never read from the config file or the command line. */
export const defaultTokenEnv = 'RELAY_DASH_SENTINEL_TOKEN';

export const defaultConfig: DashConfig = {
  sentinel: {url: 'http://127.0.0.1:7331'},
  services: [{name: 'inference', url: 'http://127.0.0.1:8080'}],
  intervalSeconds: 5,
};

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

const checkUrl = (value: unknown, where: string): string => {
  if (typeof value !== 'string') throw new ConfigError(`${where} must be a URL string`);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ConfigError(`${where} is not a valid URL: ${value}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ConfigError(`${where} must use http or https: ${value}`);
  }
  return value;
};

const checkInterval = (value: unknown, where: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 3600) {
    throw new ConfigError(`${where} must be a number of seconds between 1 and 3600`);
  }
  return value;
};

const checkUniqueNames = (services: readonly ServiceSource[]): void => {
  const names = new Set<string>();
  for (const service of services) {
    if (names.has(service.name)) throw new ConfigError(`duplicate service name: ${service.name}`);
    names.add(service.name);
  }
};

/** Parse `name=url` from `--service`. */
export const parseServiceFlag = (value: string): ServiceSource => {
  const index = value.indexOf('=');
  const name = value.slice(0, Math.max(0, index)).trim();
  if (index <= 0 || name === '') throw new ConfigError(`--service expects name=url, got: ${value}`);
  return {name, url: checkUrl(value.slice(index + 1).trim(), `--service ${name}`)};
};

/**
 * Validate a parsed config file. Unknown keys are rejected so a typo does not
 * silently fall back to a default.
 */
export const parseConfig = (
  value: unknown,
  env: Record<string, string | undefined> = {},
): DashConfig => {
  if (!isRecord(value)) throw new ConfigError('the config file must contain a JSON object');
  for (const key of Object.keys(value)) {
    if (!['$schema', 'sentinel', 'services', 'intervalSeconds'].includes(key)) {
      throw new ConfigError(`unknown config key: ${key}`);
    }
  }
  const config: DashConfig = {...defaultConfig};
  const defaultToken = env[defaultTokenEnv];
  if (defaultConfig.sentinel && defaultToken) {
    config.sentinel = {...defaultConfig.sentinel, token: defaultToken};
  }
  if (value.sentinel === false) {
    delete config.sentinel;
  } else if (value.sentinel !== undefined) {
    if (!isRecord(value.sentinel)) throw new ConfigError('sentinel must be an object or false');
    const tokenEnv = value.sentinel.tokenEnv ?? defaultTokenEnv;
    if (typeof tokenEnv !== 'string') throw new ConfigError('sentinel.tokenEnv must be a string');
    if ('token' in value.sentinel) {
      throw new ConfigError(
        `sentinel.token is not read from the config file; set ${tokenEnv} instead`,
      );
    }
    const token = env[tokenEnv];
    config.sentinel = {
      url: checkUrl(value.sentinel.url, 'sentinel.url'),
      ...(token ? {token} : {}),
    };
  }
  if (value.services !== undefined) {
    if (!Array.isArray(value.services)) throw new ConfigError('services must be an array');
    config.services = value.services.map((entry: unknown, index) => {
      if (!isRecord(entry) || typeof entry.name !== 'string' || entry.name.trim() === '') {
        throw new ConfigError(`services[${index}] needs a name`);
      }
      return {name: entry.name, url: checkUrl(entry.url, `services[${index}].url`)};
    });
  }
  if (value.intervalSeconds !== undefined) {
    config.intervalSeconds = checkInterval(value.intervalSeconds, 'intervalSeconds');
  }
  checkUniqueNames(config.services);
  return config;
};

export interface ConfigOverrides {
  configPath?: string;
  sentinelUrl?: string;
  noSentinel?: boolean;
  services?: string[];
  intervalSeconds?: number;
}

const readConfigFile = async (path: string, required: boolean): Promise<unknown> => {
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    if (!required && (error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw new ConfigError(`cannot read ${path}: ${(error as Error).message}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new ConfigError(`${path} is not valid JSON: ${(error as Error).message}`);
  }
};

/**
 * Load `relay-dash.json` from the working directory (or `--config`), then
 * apply command-line overrides. A missing default file is fine; a missing
 * `--config` file is an error.
 */
export const loadConfig = async (
  overrides: ConfigOverrides = {},
  env: Record<string, string | undefined> = process.env,
): Promise<DashConfig> => {
  const file = await readConfigFile(
    overrides.configPath ?? 'relay-dash.json',
    overrides.configPath !== undefined,
  );
  const config = parseConfig(file, env);
  if (overrides.noSentinel) {
    delete config.sentinel;
  } else if (overrides.sentinelUrl !== undefined) {
    const token = config.sentinel?.token ?? env[defaultTokenEnv];
    config.sentinel = {
      url: checkUrl(overrides.sentinelUrl, '--sentinel'),
      ...(token ? {token} : {}),
    };
  }
  if (overrides.services !== undefined && overrides.services.length > 0) {
    config.services = overrides.services.map(parseServiceFlag);
  }
  if (overrides.intervalSeconds !== undefined) {
    config.intervalSeconds = checkInterval(overrides.intervalSeconds, '--interval');
  }
  checkUniqueNames(config.services);
  return config;
};
