'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';

const API_ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/jobs',
    description: 'List all jobs with pagination and filtering',
    example: 'curl http://localhost:3010/api/jobs?page=1&limit=20&status=completed',
  },
  {
    method: 'GET',
    path: '/api/jobs/:id',
    description: 'Get detailed job information with scenes',
    example: 'curl http://localhost:3010/api/jobs/9888cbe1-711c-4bd5-bb53-2e3debc8e2ee',
  },
  {
    method: 'POST',
    path: '/api/analyze',
    description: 'Create new job and queue for AI analysis',
    example: `curl -X POST http://localhost:3010/api/analyze \\
  -H "Content-Type: application/json" \\
  -d '{"raw_script":"Your news script here..."}'`,
  },
  {
    method: 'POST',
    path: '/api/jobs/:id/compile',
    description: 'Upload avatar MP4 and trigger video rendering',
    example: 'curl -X POST http://localhost:3010/api/jobs/:id/compile -F "avatar=@avatar.mp4"',
  },
  {
    method: 'POST',
    path: '/api/jobs/:id/scenes/:scene_id/regenerate',
    description: 'Regenerate image for a specific scene',
    example: 'curl -X POST http://localhost:3010/api/jobs/:id/scenes/:scene_id/regenerate',
  },
  {
    method: 'PATCH',
    path: '/api/jobs/:id/scenes/:scene_id',
    description: 'Update scene ticker headline',
    example: `curl -X PATCH http://localhost:3010/api/jobs/:id/scenes/:scene_id \\
  -H "Content-Type: application/json" \\
  -d '{"ticker_headline":"Updated headline"}'`,
  },
  {
    method: 'POST',
    path: '/api/jobs/:id/scenes/:scene_id/upload',
    description: 'Manually upload custom image for scene',
    example: 'curl -X POST http://localhost:3010/api/jobs/:id/scenes/:scene_id/upload -F "image=@custom.png"',
  },
  {
    method: 'GET',
    path: '/api/files',
    description: 'Retrieve file from local storage',
    example: 'curl "http://localhost:3010/api/files?path=C:\\Users\\konra\\ObsidianNewsDesk\\images\\image.png"',
  },
  {
    method: 'POST',
    path: '/api/jobs/:id/launch-browser',
    description: 'Launch browser for HeyGen avatar creation',
    example: 'curl -X POST http://localhost:3010/api/jobs/:id/launch-browser',
  },
  {
    method: 'GET',
    path: '/api/settings',
    description: 'Load current environment settings',
    example: 'curl http://localhost:3010/api/settings',
  },
  {
    method: 'POST',
    path: '/api/settings',
    description: 'Save settings to .env file',
    example: `curl -X POST http://localhost:3010/api/settings \\
  -H "Content-Type: application/json" \\
  -d '{"AI_PROVIDER":"claude","ANTHROPIC_API_KEY":"sk-ant-..."}'`,
  },
];

export default function TerminalPage() {
  return (
    <div>
      <PageHeader
        title="API DOCUMENTATION"
        subtitle="REST Endpoints & Usage Examples"
      />

      <div className="max-w-6xl mx-auto space-y-6">
        <Card variant="default">
          <div className="border-b border-outline-variant/20 px-6 py-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              🔌 Available Endpoints
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Base URL: <code className="bg-surface-container-lowest px-2 py-1">http://localhost:3010</code>
            </p>
          </div>

          <div className="divide-y divide-outline-variant/20">
            {API_ENDPOINTS.map((endpoint, index) => (
              <div key={index} className="px-6 py-6 space-y-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`
                      px-3 py-1 text-xs font-bold uppercase tracking-wider
                      ${
                        endpoint.method === 'GET'
                          ? 'bg-green-900/20 text-green-400 border border-green-500/30'
                          : endpoint.method === 'POST'
                          ? 'bg-blue-900/20 text-blue-400 border border-blue-500/30'
                          : 'bg-yellow-900/20 text-yellow-400 border border-yellow-500/30'
                      }
                    `}
                  >
                    {endpoint.method}
                  </span>
                  <code className="text-primary font-mono text-sm">{endpoint.path}</code>
                </div>

                <p className="text-on-surface-variant text-sm">{endpoint.description}</p>

                <div className="bg-surface-container-lowest p-4 overflow-x-auto">
                  <pre className="font-mono text-xs text-outline-variant whitespace-pre-wrap break-all">
                    {endpoint.example}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card variant="default">
          <div className="px-6 py-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              📝 Notes
            </h3>
            <ul className="space-y-2 text-sm text-on-surface-variant list-disc list-inside">
              <li>All endpoints return JSON (except /api/files which returns binary data)</li>
              <li>Error responses include <code className="bg-surface-container-lowest px-1">error</code> and optional <code className="bg-surface-container-lowest px-1">details</code> fields</li>
              <li>File uploads use <code className="bg-surface-container-lowest px-1">multipart/form-data</code></li>
              <li>Replace <code className="bg-surface-container-lowest px-1">:id</code> and <code className="bg-surface-container-lowest px-1">:scene_id</code> with actual UUIDs</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
