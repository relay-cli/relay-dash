export interface Sample {
  name: string;
  labels: Record<string, string>;
  value: number;
}

const samplePattern = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{(.*)\})?\s+(\S+)/;
const labelPattern = /([a-zA-Z_][a-zA-Z0-9_]*)="((?:[^"\\]|\\.)*)"/g;

const parseValue = (raw: string): number => {
  if (raw === '+Inf') return Infinity;
  if (raw === '-Inf') return -Infinity;
  return Number(raw);
};

/** Parse the Prometheus text exposition format into samples. Comments and malformed lines are skipped. */
export const parseMetrics = (text: string): Sample[] => {
  const samples: Sample[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const match = samplePattern.exec(trimmed);
    if (!match) continue;
    const [, name = '', labelText = '', rawValue = ''] = match;
    const value = parseValue(rawValue);
    if (Number.isNaN(value)) continue;
    const labels: Record<string, string> = {};
    for (const label of labelText.matchAll(labelPattern)) {
      labels[label[1] ?? ''] = (label[2] ?? '').replace(/\\(.)/g, (_, char: string) =>
        char === 'n' ? '\n' : char,
      );
    }
    samples.push({name, labels, value});
  }
  return samples;
};

/** Sum every sample whose name matches. Returns `undefined` when none does. */
export const sumMetric = (
  samples: readonly Sample[],
  matches: (name: string) => boolean,
): number | undefined => {
  let total: number | undefined;
  for (const sample of samples) {
    if (matches(sample.name)) total = (total ?? 0) + sample.value;
  }
  return total;
};
