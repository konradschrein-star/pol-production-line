'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchJob } from '@/lib/utils/api';
import type { JobStatus } from '@/lib/utils/status';

interface Job {
  id: string;
  status: JobStatus;
  raw_script: string;
  avatar_script?: string;
  avatar_mp4_url?: string;
  final_video_url?: string;
  created_at: string;
  updated_at?: string;
  render_logs?: Array<{
    timestamp: string;
    type: 'info' | 'warn' | 'error' | 'success';
    message: string;
  }>;
}

interface Scene {
  id: string;
  job_id: string;
  scene_order: number;
  image_prompt: string;
  ticker_headline: string;
  image_url?: string;
  generation_status: string;
  created_at: string;
  updated_at: string;
}

interface ErrorDetails {
  code: 'NOT_FOUND' | 'SERVER_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN';
  message: string;
  retryable: boolean;
}

const MAX_RETRIES = 3;

export function useJob(id: string) {
  const [job, setJob] = useState<Job | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refetch = useCallback(async (isRetry = false) => {
    if (!isRetry) {
      setLoading(true);
      retryCountRef.current = 0;
    }

    try {
      const response = await fetch(`/api/jobs/${id}`);

      if (!response.ok) {
        // Handle specific HTTP status codes
        if (response.status === 404) {
          setError({
            code: 'NOT_FOUND',
            message: 'Job not found',
            retryable: false,
          });
          setLoading(false);
          return;
        }

        // Retry on 5xx errors with exponential backoff
        if (response.status >= 500 && retryCountRef.current < MAX_RETRIES) {
          const retryDelay = Math.pow(2, retryCountRef.current) * 1000; // 1s, 2s, 4s
          console.warn(`⚠️ Server error ${response.status}, retrying in ${retryDelay}ms (attempt ${retryCountRef.current + 1}/${MAX_RETRIES})`);

          retryCountRef.current++;
          retryTimeoutRef.current = setTimeout(() => {
            refetch(true);
          }, retryDelay);
          return;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setJob(data.job);
      setScenes(data.scenes || []);
      setError(null);
      retryCountRef.current = 0;
    } catch (err) {
      const errorDetails: ErrorDetails = {
        code: err instanceof TypeError ? 'NETWORK_ERROR' : 'UNKNOWN',
        message: err instanceof Error ? err.message : 'Failed to fetch job',
        retryable: true,
      };
      setError(errorDetails);
      console.error('❌ useJob fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refetch();

    // Cleanup retry timeout on unmount
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [id, refetch]);

  return { job, scenes, loading, error, refetch };
}
