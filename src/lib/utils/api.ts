/**
 * API Client Helpers
 * Centralized fetch functions for all API routes
 */

export async function fetchJob(id: string) {
  const res = await fetch(`/api/jobs/${id}`);
  if (!res.ok) throw new Error('Failed to fetch job');
  const data = await res.json();
  return { job: data.job, scenes: data.scenes };
}

export async function fetchJobs(page = 1, limit = 20, status?: string) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });
  if (status && status !== 'all') params.append('status', status);

  const res = await fetch(`/api/jobs?${params}`);
  if (!res.ok) throw new Error('Failed to fetch jobs');
  return res.json();
}

export async function createJob(rawScript: string) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw_script: rawScript }),
  });
  if (!res.ok) throw new Error('Failed to create job');
  return res.json();
}

export async function updateScene(
  jobId: string,
  sceneId: string,
  updates: { ticker_headline?: string }
) {
  const res = await fetch(`/api/jobs/${jobId}/scenes/${sceneId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update scene');
  return res.json();
}

export async function regenerateScene(jobId: string, sceneId: string) {
  const res = await fetch(`/api/jobs/${jobId}/scenes/${sceneId}/regenerate`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to regenerate scene');
  return res.json();
}

export async function uploadSceneImage(jobId: string, sceneId: string, file: File) {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`/api/jobs/${jobId}/scenes/${sceneId}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload image');
  return res.json();
}

export async function launchBrowser(jobId: string) {
  const res = await fetch(`/api/jobs/${jobId}/launch-browser`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to launch browser');
  return res.json();
}

export async function uploadAvatar(jobId: string, file: File) {
  const formData = new FormData();
  formData.append('avatar_mp4', file);

  const res = await fetch(`/api/jobs/${jobId}/compile`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload avatar');
  return res.json();
}
