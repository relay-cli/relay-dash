/* eslint-disable no-control-regex */
// CSI and OSC sequences, then any remaining C0/C1 control character.
const escapes =
  /\u001B\[[0-?]*[ -/]*[@-~]|\u001B\][^\u0007\u001B]*(?:\u0007|\u001B\\)?|\u001B[@-_]?/g;
const controls = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;

/**
 * Make text from a watched system safe to draw on one terminal line: strip
 * escape sequences and control characters, and fold tabs and newlines into
 * spaces.
 */
export const clean = (text: string): string =>
  text
    .replace(escapes, '')
    .replace(controls, '')
    .replace(/[\t\n]+/g, ' ')
    .trim();

/** Cut text to `width` columns, ending with an ellipsis when it was longer. */
export const fit = (text: string, width: number): string => {
  if (width <= 0) return '';
  if (text.length <= width) return text;
  return width === 1 ? '…' : `${text.slice(0, width - 1)}…`;
};

/** Pad or cut text to exactly `width` columns, always leaving at least one space after it. */
export const cell = (text: string, width: number): string => fit(text, width - 1).padEnd(width);

/** A short "how long ago" label such as `12s`, `4m`, `3h`, or `2d`. */
export const ago = (iso: string, now: Date): string => {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.round((now.getTime() - then) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};
