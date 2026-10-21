import {describe, expect, it} from 'vitest';
import {parseMetrics, sumMetric} from '../src/sources/metrics.js';

describe('parseMetrics', () => {
  it('reads samples with labels and skips comments', () => {
    const samples = parseMetrics(
      [
        '# HELP impossible_requests_total Completed requests.',
        '# TYPE impossible_requests_total counter',
        'impossible_requests_total{operation="embed",outcome="ok"} 5',
        'impossible_requests_total{operation="embed",outcome="error"} 1',
        'impossible_queue_depth 2',
        'garbage line',
        'impossible_latency_seconds_bucket{le="+Inf"} +Inf',
        '',
      ].join('\r\n'),
    );
    expect(samples).toEqual([
      {
        name: 'impossible_requests_total',
        labels: {operation: 'embed', outcome: 'ok'},
        value: 5,
      },
      {
        name: 'impossible_requests_total',
        labels: {operation: 'embed', outcome: 'error'},
        value: 1,
      },
      {name: 'impossible_queue_depth', labels: {}, value: 2},
      {name: 'impossible_latency_seconds_bucket', labels: {le: '+Inf'}, value: Infinity},
    ]);
  });

  it('unescapes label values', () => {
    const [sample] = parseMetrics('m{path="a\\"b\\\\c"} 1');
    expect(sample?.labels.path).toBe('a"b\\c');
  });
});

describe('sumMetric', () => {
  it('adds matching samples and returns undefined when none match', () => {
    const samples = parseMetrics('a 1\na 2\nb 4\n');
    expect(sumMetric(samples, (name) => name === 'a')).toBe(3);
    expect(sumMetric(samples, (name) => name === 'c')).toBeUndefined();
  });
});
