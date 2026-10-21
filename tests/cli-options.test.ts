import {describe, expect, it} from 'vitest';
import {parseCliOptions} from '../src/cli/options.js';

describe('parseCliOptions', () => {
  it('defaults to the interactive dashboard', () => {
    expect(parseCliOptions([])).toEqual({
      help: false,
      version: false,
      inline: false,
      snapshot: false,
      json: false,
    });
  });

  it('reads short and long flags', () => {
    expect(parseCliOptions(['-h', '-v', '--inline', '--snapshot', '--json'])).toMatchObject({
      help: true,
      version: true,
      inline: true,
      snapshot: true,
      json: true,
    });
  });

  it('reads source options with separate or attached values', () => {
    expect(
      parseCliOptions([
        '--config',
        'dash.json',
        '--sentinel=http://den:7331',
        '--service',
        'inference=http://127.0.0.1:8080',
        '--service=ocr=http://127.0.0.1:8081',
        '--interval',
        '10',
        '--no-sentinel',
      ]),
    ).toMatchObject({
      configPath: 'dash.json',
      sentinelUrl: 'http://den:7331',
      services: ['inference=http://127.0.0.1:8080', 'ocr=http://127.0.0.1:8081'],
      intervalSeconds: 10,
      noSentinel: true,
    });
  });

  it('rejects a missing value', () => {
    expect(() => parseCliOptions(['--service'])).toThrow('--service needs a value');
  });

  it('rejects a non-numeric interval', () => {
    expect(() => parseCliOptions(['--interval', 'soon'])).toThrow('--interval expects seconds');
  });

  it('rejects unknown options', () => {
    expect(() => parseCliOptions(['--nope'])).toThrow('Unknown option: --nope');
  });
});
