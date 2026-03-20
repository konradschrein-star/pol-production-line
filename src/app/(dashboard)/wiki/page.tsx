'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';

export default function WikiPage() {
  return (
    <div>
      <PageHeader
        title="WIKI"
        subtitle="System Documentation & Reference"
      />

      <div className="space-y-6">
        {/* System Overview */}
        <Card variant="default">
          <div className="p-6">
            <h2 className="text-xl font-bold text-primary mb-4">System Overview</h2>
            <div className="text-sm text-on-surface-variant space-y-3">
              <p>
                Automated video production pipeline for news broadcasts. Processes scripts through AI analysis,
                generates images, integrates HeyGen avatars, and renders final videos with Remotion.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="font-bold text-primary mb-1">Stack</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Next.js 14 (App Router)</li>
                    <li>PostgreSQL (Supabase)</li>
                    <li>BullMQ (Redis queues)</li>
                    <li>Cloudflare R2 (storage)</li>
                    <li>Remotion (rendering)</li>
                  </ul>
                </div>
                <div>
                  <p className="font-bold text-primary mb-1">AI Providers</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Claude (Anthropic)</li>
                    <li>Gemini (Google)</li>
                    <li>Groq</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Workflow States */}
        <Card variant="default">
          <div className="p-6">
            <h2 className="text-xl font-bold text-primary mb-4">Workflow States</h2>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[120px,1fr] gap-4 items-start">
                <span className="font-mono text-xs bg-surface-container-high text-on-surface-variant px-2 py-1 rounded">pending</span>
                <span className="text-on-surface-variant">Job created, waiting for analysis queue</span>
              </div>
              <div className="grid grid-cols-[120px,1fr] gap-4 items-start">
                <span className="font-mono text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">analyzing</span>
                <span className="text-on-surface-variant">AI extracting avatar script + scene prompts</span>
              </div>
              <div className="grid grid-cols-[120px,1fr] gap-4 items-start">
                <span className="font-mono text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded">generating_images</span>
                <span className="text-on-surface-variant">G-Labs generating images via local webhook (127.0.0.1:8765)</span>
              </div>
              <div className="grid grid-cols-[120px,1fr] gap-4 items-start">
                <span className="font-mono text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">review_assets</span>
                <span className="text-on-surface-variant">
                  <strong className="text-yellow-400">MANUAL QA PAUSE</strong> - Edit tickers, regenerate images, upload avatar MP4
                </span>
              </div>
              <div className="grid grid-cols-[120px,1fr] gap-4 items-start">
                <span className="font-mono text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">rendering</span>
                <span className="text-on-surface-variant">Remotion rendering final video with Ken Burns effects + chromakey</span>
              </div>
              <div className="grid grid-cols-[120px,1fr] gap-4 items-start">
                <span className="font-mono text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">completed</span>
                <span className="text-on-surface-variant">Final video uploaded to R2, job done</span>
              </div>
              <div className="grid grid-cols-[120px,1fr] gap-4 items-start">
                <span className="font-mono text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">failed</span>
                <span className="text-on-surface-variant">Error occurred, check error_message field</span>
              </div>
              <div className="grid grid-cols-[120px,1fr] gap-4 items-start">
                <span className="font-mono text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded">cancelled</span>
                <span className="text-on-surface-variant">User cancelled, queue entries removed</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Creating Broadcasts */}
        <Card variant="default">
          <div className="p-6">
            <h2 className="text-xl font-bold text-primary mb-4">Creating Broadcasts</h2>
            <div className="space-y-4 text-sm text-on-surface-variant">
              <div>
                <p className="font-bold text-primary mb-2">1. Submit Script</p>
                <ul className="list-disc list-inside space-y-1 text-xs ml-4">
                  <li>50-10,000 characters required</li>
                  <li>AI extracts avatar narration + scene image prompts</li>
                  <li>Auto-generates ticker headlines from prompts</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary mb-2">2. Image Generation (Automatic)</p>
                <ul className="list-disc list-inside space-y-1 text-xs ml-4">
                  <li>Each scene queued to <code className="bg-surface-container px-1 rounded">queue_images</code></li>
                  <li>G-Labs webhook generates images (local service required)</li>
                  <li>Images uploaded to R2, URLs stored in DB</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary mb-2">3. Review Assets (Manual)</p>
                <ul className="list-disc list-inside space-y-1 text-xs ml-4">
                  <li>Job pauses at <code className="bg-surface-container px-1 rounded">review_assets</code></li>
                  <li>Edit ticker headlines inline</li>
                  <li>Regenerate specific images</li>
                  <li>Upload replacement images</li>
                  <li>Generate avatar via Comet (48kHz audio, H.264)</li>
                  <li>Upload avatar MP4 → advances to rendering</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary mb-2">4. Rendering (Automatic)</p>
                <ul className="list-disc list-inside space-y-1 text-xs ml-4">
                  <li>Hook (0-15s): 1.5s per image (rigid)</li>
                  <li>Body (15s+): 1 image per sentence (dynamic)</li>
                  <li>Ken Burns effect on all images</li>
                  <li>Avatar in bottom-right with chromakey</li>
                  <li>Scrolling ticker at bottom</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Managing Jobs */}
        <Card variant="default">
          <div className="p-6">
            <h2 className="text-xl font-bold text-primary mb-4">Managing Jobs</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-bold text-primary mb-2">Search & Filter</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-on-surface-variant ml-4">
                  <li>Full-text search: scripts + job IDs (300ms debounced)</li>
                  <li>Filter by status: all, pending, analyzing, generating, review, rendering, completed, failed, cancelled</li>
                  <li>Sort by: status, job ID, created date (ASC/DESC)</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary mb-2">Bulk Operations</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-on-surface-variant ml-4">
                  <li>Select jobs via checkboxes (shift+click for range)</li>
                  <li><strong>Delete:</strong> Hard delete with cascade to scenes, queue cleanup</li>
                  <li><strong>Cancel:</strong> Sets status to cancelled, removes from queues</li>
                  <li>Confirmation modals prevent accidents</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary mb-2">Edit Scripts</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-on-surface-variant ml-4">
                  <li>Only allowed in <code className="bg-surface-container px-1 rounded">pending</code> or <code className="bg-surface-container px-1 rounded">failed</code> states</li>
                  <li>Resets job to pending, clears analysis artifacts</li>
                  <li>Deletes existing scenes (forces re-analysis)</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary mb-2">Cancellation Rules</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-on-surface-variant ml-4">
                  <li><code className="bg-surface-container px-1 rounded">pending/analyzing</code> → Removes from analyze queue</li>
                  <li><code className="bg-surface-container px-1 rounded">generating_images</code> → Removes all scene jobs from images queue</li>
                  <li><code className="bg-surface-container px-1 rounded">review_assets</code> → DB update only (no queue)</li>
                  <li><code className="bg-surface-container px-1 rounded">rendering</code> → Removes from render queue</li>
                  <li><code className="bg-surface-container px-1 rounded">completed</code> → Cannot cancel (error)</li>
                  <li>Active workers won't stop immediately (must check status)</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card variant="default">
          <div className="p-6">
            <h2 className="text-xl font-bold text-primary mb-4">Keyboard Shortcuts</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-bold text-primary mb-2">Navigation</p>
                <div className="space-y-1 text-xs text-on-surface-variant font-mono">
                  <div className="grid grid-cols-[80px,1fr] gap-2">
                    <span className="text-outline">j / ↓</span>
                    <span>Next job</span>
                  </div>
                  <div className="grid grid-cols-[80px,1fr] gap-2">
                    <span className="text-outline">k / ↑</span>
                    <span>Previous job</span>
                  </div>
                  <div className="grid grid-cols-[80px,1fr] gap-2">
                    <span className="text-outline">Enter</span>
                    <span>Open selected</span>
                  </div>
                  <div className="grid grid-cols-[80px,1fr] gap-2">
                    <span className="text-outline">n</span>
                    <span>New broadcast</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="font-bold text-primary mb-2">System</p>
                <div className="space-y-1 text-xs text-on-surface-variant font-mono">
                  <div className="grid grid-cols-[80px,1fr] gap-2">
                    <span className="text-outline">?</span>
                    <span>Show all shortcuts</span>
                  </div>
                  <div className="grid grid-cols-[80px,1fr] gap-2">
                    <span className="text-outline">Esc</span>
                    <span>Close modals</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* API Endpoints */}
        <Card variant="default">
          <div className="p-6">
            <h2 className="text-xl font-bold text-primary mb-4">API Endpoints</h2>
            <div className="space-y-3 text-xs font-mono">
              <div className="bg-surface-container-low p-3 rounded">
                <div className="text-green-400 mb-1">GET /api/jobs</div>
                <div className="text-on-surface-variant ml-4">
                  ?page=1&limit=20&status=pending&search=query&sortBy=created_at&sortOrder=desc
                </div>
              </div>
              <div className="bg-surface-container-low p-3 rounded">
                <div className="text-green-400 mb-1">GET /api/jobs/[id]</div>
                <div className="text-on-surface-variant ml-4">Fetch job with scenes</div>
              </div>
              <div className="bg-surface-container-low p-3 rounded">
                <div className="text-blue-400 mb-1">POST /api/jobs</div>
                <div className="text-on-surface-variant ml-4">{'{ raw_script: string }'}</div>
              </div>
              <div className="bg-surface-container-low p-3 rounded">
                <div className="text-orange-400 mb-1">PATCH /api/jobs/[id]</div>
                <div className="text-on-surface-variant ml-4">{'{ raw_script: string } - Only pending/failed'}</div>
              </div>
              <div className="bg-surface-container-low p-3 rounded">
                <div className="text-red-400 mb-1">DELETE /api/jobs/[id]</div>
                <div className="text-on-surface-variant ml-4">Hard delete with queue cleanup</div>
              </div>
              <div className="bg-surface-container-low p-3 rounded">
                <div className="text-blue-400 mb-1">POST /api/jobs/[id]/cancel</div>
                <div className="text-on-surface-variant ml-4">{'{ reason?: string }'}</div>
              </div>
              <div className="bg-surface-container-low p-3 rounded">
                <div className="text-blue-400 mb-1">POST /api/jobs/bulk</div>
                <div className="text-on-surface-variant ml-4">{'{ action: "delete" | "cancel", jobIds: string[] }'}</div>
              </div>
              <div className="bg-surface-container-low p-3 rounded">
                <div className="text-blue-400 mb-1">POST /api/jobs/[id]/launch-comet</div>
                <div className="text-on-surface-variant ml-4">Opens Comet browser for HeyGen</div>
              </div>
              <div className="bg-surface-container-low p-3 rounded">
                <div className="text-orange-400 mb-1">PATCH /api/jobs/[id]/scenes/[scene_id]</div>
                <div className="text-on-surface-variant ml-4">{'{ ticker_headline: string }'}</div>
              </div>
              <div className="bg-surface-container-low p-3 rounded">
                <div className="text-blue-400 mb-1">POST /api/jobs/[id]/scenes/[scene_id]/regenerate</div>
                <div className="text-on-surface-variant ml-4">Re-queue image generation</div>
              </div>
              <div className="bg-surface-container-low p-3 rounded">
                <div className="text-blue-400 mb-1">POST /api/jobs/[id]/scenes/[scene_id]/upload</div>
                <div className="text-on-surface-variant ml-4">Upload replacement image</div>
              </div>
              <div className="bg-surface-container-low p-3 rounded">
                <div className="text-blue-400 mb-1">POST /api/jobs/[id]/compile</div>
                <div className="text-on-surface-variant ml-4">Upload avatar MP4, trigger rendering</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Queue System */}
        <Card variant="default">
          <div className="p-6">
            <h2 className="text-xl font-bold text-primary mb-4">Queue System (BullMQ + Redis)</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-bold text-primary mb-2">queue_analyze</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-on-surface-variant ml-4">
                  <li>Processes raw scripts through AI (Claude/Google/Groq)</li>
                  <li>Extracts avatar_script + scenes array</li>
                  <li>Scene schema: {`{ id, image_prompt, ticker_headline }`}</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary mb-2">queue_images</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-on-surface-variant ml-4">
                  <li>One job per scene (parallel processing)</li>
                  <li>Calls G-Labs webhook: <code className="bg-surface-container px-1 rounded">http://127.0.0.1:8765/api/image/generate</code></li>
                  <li>Polls <code className="bg-surface-container px-1 rounded">/api/status</code> until complete</li>
                  <li>Downloads image, uploads to R2, updates DB</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary mb-2">queue_render</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-on-surface-variant ml-4">
                  <li>Triggered when avatar MP4 uploaded</li>
                  <li>Remotion composition with Ken Burns, chromakey, ticker</li>
                  <li>Outputs to R2, marks job completed</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-yellow-400 mb-2">⚠️ No Automated Avatar Queue</p>
                <p className="text-xs text-on-surface-variant ml-4">
                  HeyGen avatar generation is manual. Job pauses at <code className="bg-surface-container px-1 rounded">review_assets</code> until
                  operator uploads avatar MP4 via Storyboard Bridge.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Troubleshooting */}
        <Card variant="default">
          <div className="p-6">
            <h2 className="text-xl font-bold text-primary mb-4">Troubleshooting</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-bold text-red-400 mb-2">Job Stuck in "analyzing"</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-on-surface-variant ml-4">
                  <li>Check Redis connection (port 7892)</li>
                  <li>Verify AI_PROVIDER key is valid</li>
                  <li>Check worker logs for errors</li>
                  <li>Cancel job, edit script, resubmit</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-red-400 mb-2">Job Stuck in "generating_images"</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-on-surface-variant ml-4">
                  <li>Ensure G-Labs running at 127.0.0.1:8765</li>
                  <li>Check scene generation_status in DB</li>
                  <li>Regenerate failed scenes individually</li>
                  <li>Upload replacement images manually</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-red-400 mb-2">Rendering Fails</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-on-surface-variant ml-4">
                  <li>Verify avatar MP4 is H.264, 48kHz audio</li>
                  <li>Check all scenes have image_url</li>
                  <li>Verify R2 credentials (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)</li>
                  <li>Increase REMOTION_TIMEOUT_MS if timeout</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-red-400 mb-2">Queue Cleanup Failed</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-on-surface-variant ml-4">
                  <li>Check logs for cleanup errors (non-fatal)</li>
                  <li>Active workers won't stop immediately</li>
                  <li>Stale jobs cleaned by Redis TTL</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Database Schema */}
        <Card variant="default">
          <div className="p-6">
            <h2 className="text-xl font-bold text-primary mb-4">Database Schema</h2>
            <div className="space-y-4 text-xs font-mono">
              <div>
                <p className="font-bold text-primary mb-2">news_jobs</p>
                <div className="bg-surface-container-low p-3 rounded text-on-surface-variant">
                  id UUID PRIMARY KEY<br/>
                  status VARCHAR(50) - State machine value<br/>
                  raw_script TEXT - Original input<br/>
                  avatar_script TEXT - AI-extracted narration<br/>
                  avatar_mp4_url TEXT - HeyGen output<br/>
                  final_video_url TEXT - Remotion output<br/>
                  error_message TEXT - Failure details<br/>
                  cancellation_reason TEXT - Why cancelled<br/>
                  created_at TIMESTAMP<br/>
                  updated_at TIMESTAMP
                </div>
              </div>
              <div>
                <p className="font-bold text-primary mb-2">news_scenes</p>
                <div className="bg-surface-container-low p-3 rounded text-on-surface-variant">
                  id UUID PRIMARY KEY<br/>
                  job_id UUID REFERENCES news_jobs(id) ON DELETE CASCADE<br/>
                  scene_order INTEGER - Display sequence<br/>
                  image_prompt TEXT - AI-generated<br/>
                  ticker_headline VARCHAR(200) - Editable<br/>
                  image_url TEXT - R2 URL<br/>
                  generation_status VARCHAR(50) - pending/generating/completed/failed<br/>
                  error_message TEXT<br/>
                  created_at TIMESTAMP<br/>
                  updated_at TIMESTAMP
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Environment Variables */}
        <Card variant="default">
          <div className="p-6">
            <h2 className="text-xl font-bold text-primary mb-4">Environment Variables</h2>
            <div className="space-y-2 text-xs font-mono">
              <div className="grid grid-cols-[200px,1fr] gap-4 items-start">
                <span className="text-primary">DATABASE_URL</span>
                <span className="text-on-surface-variant">PostgreSQL connection string</span>
              </div>
              <div className="grid grid-cols-[200px,1fr] gap-4 items-start">
                <span className="text-primary">REDIS_HOST</span>
                <span className="text-on-surface-variant">Redis host (default: localhost)</span>
              </div>
              <div className="grid grid-cols-[200px,1fr] gap-4 items-start">
                <span className="text-primary">REDIS_PORT</span>
                <span className="text-on-surface-variant">Redis port (default: 7892)</span>
              </div>
              <div className="grid grid-cols-[200px,1fr] gap-4 items-start">
                <span className="text-primary">REDIS_PASSWORD</span>
                <span className="text-on-surface-variant">Redis authentication</span>
              </div>
              <div className="grid grid-cols-[200px,1fr] gap-4 items-start">
                <span className="text-primary">R2_ACCESS_KEY_ID</span>
                <span className="text-on-surface-variant">Cloudflare R2 credentials</span>
              </div>
              <div className="grid grid-cols-[200px,1fr] gap-4 items-start">
                <span className="text-primary">R2_SECRET_ACCESS_KEY</span>
                <span className="text-on-surface-variant">Cloudflare R2 secret</span>
              </div>
              <div className="grid grid-cols-[200px,1fr] gap-4 items-start">
                <span className="text-primary">R2_BUCKET</span>
                <span className="text-on-surface-variant">Bucket name</span>
              </div>
              <div className="grid grid-cols-[200px,1fr] gap-4 items-start">
                <span className="text-primary">R2_ENDPOINT</span>
                <span className="text-on-surface-variant">Cloudflare R2 endpoint URL</span>
              </div>
              <div className="grid grid-cols-[200px,1fr] gap-4 items-start">
                <span className="text-primary">AI_PROVIDER</span>
                <span className="text-on-surface-variant">claude | google | groq</span>
              </div>
              <div className="grid grid-cols-[200px,1fr] gap-4 items-start">
                <span className="text-primary">ANTHROPIC_API_KEY</span>
                <span className="text-on-surface-variant">Claude API key</span>
              </div>
              <div className="grid grid-cols-[200px,1fr] gap-4 items-start">
                <span className="text-primary">GOOGLE_AI_API_KEY</span>
                <span className="text-on-surface-variant">Gemini API key</span>
              </div>
              <div className="grid grid-cols-[200px,1fr] gap-4 items-start">
                <span className="text-primary">GROQ_API_KEY</span>
                <span className="text-on-surface-variant">Groq API key</span>
              </div>
              <div className="grid grid-cols-[200px,1fr] gap-4 items-start">
                <span className="text-primary">HEYGEN_AUDIO_SAMPLE_RATE</span>
                <span className="text-on-surface-variant">48000 (required for HeyGen)</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
