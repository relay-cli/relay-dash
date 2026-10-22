import {describe, expect, it} from 'vitest';
import {ago, cell, clean, fit} from '../src/text.js';

describe('clean', () => {
  it('removes escape sequences and control characters', () => {
    expect(clean('\u001B[31mred\u001B[0m \u001B]8;;http://x\u001B\\link\u001B]8;;\u001B\\')).toBe(
      'red link',
    );
    expect(clean('a\u0000b\u0007c\u009Bd')).toBe('abcd');
  });

  it('folds tabs and newlines into one space', () => {
    expect(clean('  one\n\ttwo\r\nthree  ')).toBe('one two three');
  });
});

describe('fit and cell', () => {
  it('cuts long text with an ellipsis', () => {
    expect(fit('abcdef', 4)).toBe('abc…');
    expect(fit('abc', 4)).toBe('abc');
    expect(fit('abc', 1)).toBe('…');
    expect(fit('abc', 0)).toBe('');
  });

  it('pads to a fixed width with a gap after the text', () => {
    expect(cell('ab', 4)).toBe('ab  ');
    expect(cell('abc', 4)).toBe('abc ');
    expect(cell('abcd', 4)).toBe('ab… ');
    expect(cell('abcdef', 4)).toBe('ab… ');
  });
});

describe('ago', () => {
  const now = new Date('2026-10-21T12:00:00.000Z');
  it.each([
    ['2026-10-21T11:59:48.000Z', '12s'],
    ['2026-10-21T11:56:00.000Z', '4m'],
    ['2026-10-21T09:00:00.000Z', '3h'],
    ['2026-10-18T12:00:00.000Z', '3d'],
    ['2026-10-21T12:00:05.000Z', '0s'],
    ['not a date', ''],
  ])('%s is %s', (iso, label) => {
    expect(ago(iso, now)).toBe(label);
  });
});
