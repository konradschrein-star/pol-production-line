'use client';

import { useEffect } from 'react';

/**
 * usePolling Hook
 * Polls a function at a given interval until a condition is met
 */
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  interval: number,
  shouldContinue: (data: T) => boolean,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    let intervalId: NodeJS.Timeout;
    let isMounted = true;

    const poll = async () => {
      if (!isMounted) return;

      try {
        const result = await fetchFn();

        if (!isMounted) return;

        if (!shouldContinue(result)) {
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    intervalId = setInterval(poll, interval);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [fetchFn, interval, shouldContinue, enabled]);
}
