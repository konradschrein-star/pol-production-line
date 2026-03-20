'use client';

import { useEffect, useState } from 'react';
import { fetchJob } from '@/lib/utils/api';

interface Job {
  id: string;
  status: string;
  raw_script: string;
  avatar_script?: string;
  avatar_mp4_url?: string;
  final_video_url?: string;
  created_at: string;
  updated_at?: string;
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
}

export function useJob(id: string) {
  const [job, setJob] = useState<Job | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    try {
      setLoading(true);
      const data = await fetchJob(id);
      setJob(data.job);
      setScenes(data.scenes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch job');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [id]);

  return { job, scenes, loading, error, refetch };
}
