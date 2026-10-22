import React from 'react';
import {render} from 'ink-testing-library';
import {describe, expect, it, vi} from 'vitest';
import type {DashConfig} from '../src/config.js';
import {Dashboard} from '../src/views/Dashboard.js';
import {fakeFetch} from './helpers/fake-fetch.js';

const url = 'http://127.0.0.1:8080';
const config: DashConfig = {services: [{name: 'inference', url}], intervalSeconds: 60};

const ready = () =>
  fakeFetch({
    [`${url}/health/live`]: {body: {status: 'live'}},
    [`${url}/health/ready`]: {body: {status: 'ready'}},
    [`${url}/v1/models`]: {body: {data: [{id: 'qwen3-8b'}]}},
    [`${url}/metrics`]: {body: 'impossible_queue_depth 0\n'},
  });

describe('Dashboard', () => {
  it('polls on mount and redraws with the results', async () => {
    const fake = ready();
    const view = render(
      <Dashboard config={config} requestOptions={{fetch: fake.fetch}} width={80} height={12} />,
    );
    expect(view.lastFrame()).toContain('checking…');
    await vi.waitFor(() => expect(view.lastFrame()).toMatch(/● inference\s+ready/));
    expect(view.lastFrame()).toContain('qwen3-8b');
    view.unmount();
  });

  it('polls again on r', async () => {
    const fake = ready();
    const view = render(
      <Dashboard config={config} requestOptions={{fetch: fake.fetch}} width={80} height={12} />,
    );
    await vi.waitFor(() => expect(view.lastFrame()).toMatch(/ready/));
    const before = fake.calls.length;
    view.stdin.write('r');
    await vi.waitFor(() => expect(fake.calls.length).toBeGreaterThan(before));
    view.unmount();
  });
});
