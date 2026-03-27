'use client';

import { useEffect, useRef } from 'react';

/**
 * usePolling Hook
 * Polls a function at a given interval until a condition is met
 *
 * Uses stable refs to prevent polling restart on function changes
 */
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  interval: number,
  shouldContinue: (data: T) => boolean,
  enabled = true
) {
  // Stable references using useRef to prevent effect restart
  const fetchFnRef = useRef(fetchFn);
  const shouldContinueRef = useRef(shouldContinue);

  // Update refs when functions change (doesn't restart effect)
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    shouldContinueRef.current = shouldContinue;
  }, [shouldContinue]);

  useEffect(() => {
    if (!enabled) return;

    let intervalId: NodeJS.Timeout;
    let isMounted = true;

    const poll = async () => {
      if (!isMounted) return;

      try {
        const result = await fetchFnRef.current();

        if (!isMounted) return;

        if (!shouldContinueRef.current(result)) {
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
  }, [interval, enabled]); // Only depend on primitives
}
