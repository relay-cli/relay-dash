import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {
  ConfigError,
  defaultConfig,
  loadConfig,
  parseConfig,
  parseServiceFlag,
} from '../src/config.js';

describe('parseConfig', () => {
  it('uses the defaults for an empty object', () => {
    expect(parseConfig({})).toEqual(defaultConfig);
  });

  it('reads sources and takes the token from the environment', () => {
    const config = parseConfig(
      {
        sentinel: {url: 'http://den:7331', tokenEnv: 'DEN_TOKEN'},
        services: [
          {name: 'inference', url: 'http://127.0.0.1:8080'},
          {name: 'ocr', url: 'http://127.0.0.1:8081'},
        ],
        intervalSeconds: 10,
      },
      {DEN_TOKEN: 'secret'},
    );
    expect(config).toEqual({
      sentinel: {url: 'http://den:7331', token: 'secret'},
      services: [
        {name: 'inference', url: 'http://127.0.0.1:8080'},
        {name: 'ocr', url: 'http://127.0.0.1:8081'},
      ],
      intervalSeconds: 10,
    });
  });

  it('applies the default token variable to the default address', () => {
    expect(parseConfig({}, {RELAY_DASH_SENTINEL_TOKEN: 't'}).sentinel).toEqual({
      url: 'http://127.0.0.1:7331',
      token: 't',
    });
  });

  it('turns pack-sentinel off with false', () => {
    expect(parseConfig({sentinel: false}).sentinel).toBeUndefined();
  });

  it.each([
    [{sentinel: {url: 'http://x', token: 'leak'}}, 'sentinel.token is not read'],
    [{sentinel: {url: 'ftp://x'}}, 'must use http or https'],
    [{services: [{name: 'a', url: 'nope'}]}, 'not a valid URL'],
    [{services: [{url: 'http://x'}]}, 'needs a name'],
    [
      {
        services: [
          {name: 'a', url: 'http://x'},
          {name: 'a', url: 'http://y'},
        ],
      },
      'duplicate service name',
    ],
    [{intervalSeconds: 0}, 'between 1 and 3600'],
    [{servics: []}, 'unknown config key: servics'],
    [[], 'JSON object'],
  ])('rejects %j', (value, message) => {
    expect(() => parseConfig(value)).toThrow(message);
  });
});

describe('parseServiceFlag', () => {
  it('splits name and url at the first equals sign', () => {
    expect(parseServiceFlag('ocr=http://127.0.0.1:8081/?a=b')).toEqual({
      name: 'ocr',
      url: 'http://127.0.0.1:8081/?a=b',
    });
  });

  it('requires a name', () => {
    expect(() => parseServiceFlag('=http://x')).toThrow(ConfigError);
    expect(() => parseServiceFlag('http://x')).toThrow(ConfigError);
  });
});

describe('loadConfig', () => {
  let directory = '';
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'relay-dash-'));
  });
  afterEach(async () => {
    await rm(directory, {recursive: true, force: true});
  });

  it('reads a config file and applies command-line overrides', async () => {
    const path = join(directory, 'dash.json');
    await writeFile(
      path,
      JSON.stringify({services: [{name: 'voice', url: 'http://127.0.0.1:8082'}]}),
    );
    const config = await loadConfig(
      {
        configPath: path,
        sentinelUrl: 'http://den:7331',
        services: ['ocr=http://127.0.0.1:8081'],
        intervalSeconds: 30,
      },
      {RELAY_DASH_SENTINEL_TOKEN: 'tok'},
    );
    expect(config).toEqual({
      sentinel: {url: 'http://den:7331', token: 'tok'},
      services: [{name: 'ocr', url: 'http://127.0.0.1:8081'}],
      intervalSeconds: 30,
    });
  });

  it('fails when an explicit config file is missing', async () => {
    await expect(loadConfig({configPath: join(directory, 'missing.json')}, {})).rejects.toThrow(
      ConfigError,
    );
  });

  it('turns pack-sentinel off from the command line', async () => {
    const path = join(directory, 'dash.json');
    await writeFile(path, JSON.stringify({sentinel: {url: 'http://den:7331'}}));
    const config = await loadConfig({configPath: path, noSentinel: true}, {});
    expect(config.sentinel).toBeUndefined();
  });
});
