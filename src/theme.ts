export interface ShellTheme {
  name: string;
  background: string;
  surface: string;
  rule: string;
  text: string;
  muted: string;
  accent: string;
  focus: string;
  success: string;
  danger: string;
  warning: string;
}

export const relayTheme: ShellTheme = {
  name: 'relay',
  background: '#080B0F',
  surface: '#111820',
  rule: '#34414D',
  text: '#E8EDF2',
  muted: '#84909C',
  accent: '#FF8A3D',
  focus: '#48A8FF',
  success: '#4FD18B',
  danger: '#FF4D5A',
  warning: '#F0C84B',
};

export const monoTheme: ShellTheme = {
  ...relayTheme,
  name: 'mono',
  accent: '#E8EDF2',
  focus: '#E8EDF2',
  success: '#B8C0C8',
};

export const shellThemes = new Map([
  [relayTheme.name, relayTheme],
  [monoTheme.name, monoTheme],
]);
