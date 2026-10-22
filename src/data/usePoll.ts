import {useCallback, useEffect, useRef, useState} from 'react';
import type {DashConfig} from '../config.js';
import type {RequestOptions} from '../sources/http.js';
import {pollOnce} from '../sources/poll.js';
import type {DashboardData} from '../sources/poll.js';

export interface PollState {
  /** The most recent results. Undefined until the first poll finishes. */
  data?: DashboardData;
  /** True while a poll is in flight. */
  polling: boolean;
  /** Poll now instead of waiting for the next interval. */
  refresh: () => void;
}

/**
 * Poll every source on the configured interval. A slow poll is never
 * overlapped by the next one, and an unmounted dashboard aborts its requests.
 */
export const usePoll = (
  config: DashConfig,
  options: Omit<RequestOptions, 'signal'> = {},
  initial?: DashboardData,
): PollState => {
  const [data, setData] = useState<DashboardData | undefined>(initial);
  const [polling, setPolling] = useState(false);
  const inFlight = useRef(false);
  const controller = useRef(new AbortController());
  const timer = useRef<NodeJS.Timeout | undefined>(undefined);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // A function, so TypeScript does not narrow `aborted` across the await.
  const stopped = (): boolean => controller.current.signal.aborted;

  const poll = useCallback(async () => {
    if (inFlight.current || stopped()) return;
    inFlight.current = true;
    setPolling(true);
    clearTimeout(timer.current);
    try {
      const next = await pollOnce(config, {
        ...optionsRef.current,
        signal: controller.current.signal,
      });
      if (!stopped()) setData(next);
    } finally {
      inFlight.current = false;
      if (!stopped()) {
        setPolling(false);
        timer.current = setTimeout(() => void poll(), config.intervalSeconds * 1000);
      }
    }
  }, [config]);

  useEffect(() => {
    controller.current = new AbortController();
    void poll();
    return () => {
      controller.current.abort();
      clearTimeout(timer.current);
    };
  }, [poll]);

  return {...(data === undefined ? {} : {data}), polling, refresh: () => void poll()};
};
