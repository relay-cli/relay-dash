import {describe, expect, it} from 'vitest';
import {parseCliOptions} from '../src/cli/options.js';

describe('parseCliOptions', () => {
  it('defaults to the interactive dashboard', () => {
    expect(parseCliOptions([])).toEqual({
      help: false,
      version: false,
      inline: false,
      snapshot: false,
    });
  });

  it('reads short and long flags', () => {
    expect(parseCliOptions(['-h', '-v', '--inline', '--snapshot'])).toEqual({
      help: true,
      version: true,
      inline: true,
      snapshot: true,
    });
  });

  it('rejects unknown options', () => {
    expect(() => parseCliOptions(['--nope'])).toThrow('Unknown option: --nope');
  });
});
