#!/usr/bin/env node

/**
 * Pexels MCP Server
 *
 * Model Context Protocol server that exposes Pexels API functionality to AI assistants.
 * This allows LLMs to search, download, and manage stock photos and videos programmatically.
 *
 * Features:
 * - Search videos and photos
 * - Download media files
 * - Smart selection algorithms
 * - Rate limit management
 * - Caching support
 *
 * Usage:
 *   node src/mcp/pexels-server.ts
 *
 * Environment Variables:
 *   PEXELS_API_KEY - Pexels API key (required)
 *   PEXELS_CACHE_TTL - Cache TTL in milliseconds (optional, default: 3600000)
 *   PEXELS_DEBUG - Enable debug logging (optional, default: false)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createPexelsClient, PexelsClient } from '../lib/pexels/index.js';
import { PexelsError } from '../lib/pexels/errors.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface PexelsServerConfig {
  apiKey: string;
  cacheTtl?: number;
  debug?: boolean;
  outputDir?: string;
}

class PexelsServer {
  private server: Server;
  private client: PexelsClient;
  private outputDir: string;

  constructor(config: PexelsServerConfig) {
    this.server = new Server(
      {
        name: 'pexels-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.client = createPexelsClient({
      apiKey: config.apiKey,
      enableCache: true,
      cacheTtl: config.cacheTtl || 3600000,
      debug: config.debug || false,
    });

    this.outputDir = config.outputDir || path.join(process.cwd(), 'downloads');

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_videos',
          description: 'Search for stock videos on Pexels. Returns list of videos matching the query.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query (e.g., "breaking news", "cityscape", "technology")',
              },
              orientation: {
                type: 'string',
                enum: ['landscape', 'portrait', 'square'],
                description: 'Video orientation filter',
              },
              size: {
                type: 'string',
                enum: ['large', 'medium', 'small'],
                description: 'Video size filter',
              },
              min_duration: {
                type: 'number',
                description: 'Minimum video duration in seconds',
              },
              max_duration: {
                type: 'number',
                description: 'Maximum video duration in seconds',
              },
              per_page: {
                type: 'number',
                description: 'Results per page (max: 80)',
                minimum: 1,
                maximum: 80,
              },
              page: {
                type: 'number',
                description: 'Page number (for pagination)',
                minimum: 1,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'search_photos',
          description: 'Search for stock photos on Pexels. Returns list of photos matching the query.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query (e.g., "sunset", "coffee", "workspace")',
              },
              orientation: {
                type: 'string',
                enum: ['landscape', 'portrait', 'square'],
                description: 'Photo orientation filter',
              },
              size: {
                type: 'string',
                enum: ['large', 'medium', 'small'],
                description: 'Photo size filter',
              },
              color: {
                type: 'string',
                description: 'Color filter (e.g., "red", "blue", "#ffffff")',
              },
              per_page: {
                type: 'number',
                description: 'Results per page (max: 80)',
                minimum: 1,
                maximum: 80,
              },
              page: {
                type: 'number',
                description: 'Page number (for pagination)',
                minimum: 1,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'select_best_video',
          description: 'Select the best video from search results using scoring algorithm. Prioritizes HD quality (1920x1080), ideal duration (5-30s), and landscape orientation.',
          inputSchema: {
            type: 'object',
            properties: {
              videos: {
                type: 'array',
                description: 'Array of video objects from search results',
                items: { type: 'object' },
              },
            },
            required: ['videos'],
          },
        },
        {
          name: 'download_video',
          description: 'Download a video file from Pexels and save to disk. Returns local file path.',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Video download URL',
              },
              filename: {
                type: 'string',
                description: 'Output filename (optional, will auto-generate if not provided)',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'download_photo',
          description: 'Download a photo file from Pexels and save to disk. Returns local file path.',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Photo download URL',
              },
              filename: {
                type: 'string',
                description: 'Output filename (optional, will auto-generate if not provided)',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'get_rate_limit_status',
          description: 'Get current API rate limit status. Shows requests used, limit, and reset time.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_cache_stats',
          description: 'Get cache statistics. Shows cache size, hits, misses, and expired entries.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'clear_cache',
          description: 'Clear all cached search results.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_videos': {
            const results = await this.client.searchVideos(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      total_results: results.total_results,
                      page: results.page,
                      per_page: results.per_page,
                      videos: results.videos.map((v) => ({
                        id: v.id,
                        width: v.width,
                        height: v.height,
                        duration: v.duration,
                        url: v.url,
                        image: v.image,
                        video_files: v.video_files.map((f) => ({
                          id: f.id,
                          quality: f.quality,
                          width: f.width,
                          height: f.height,
                          fps: f.fps,
                          link: f.link,
                        })),
                      })),
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case 'search_photos': {
            const results = await this.client.searchPhotos(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      total_results: results.total_results,
                      page: results.page,
                      per_page: results.per_page,
                      photos: results.photos.map((p) => ({
                        id: p.id,
                        width: p.width,
                        height: p.height,
                        url: p.url,
                        photographer: p.photographer,
                        alt: p.alt,
                        avg_color: p.avg_color,
                        src: p.src,
                      })),
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case 'select_best_video': {
            const { videos } = args as { videos: any[] };
            const best = this.client.selectBestVideo(videos);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(best, null, 2),
                },
              ],
            };
          }

          case 'download_video': {
            const { url, filename } = args as { url: string; filename?: string };
            await fs.mkdir(this.outputDir, { recursive: true });

            const fname = filename || `video-${Date.now()}.mp4`;
            const outputPath = path.join(this.outputDir, fname);

            const buffer = await this.client.downloadVideo(url);
            await fs.writeFile(outputPath, buffer);

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      success: true,
                      path: outputPath,
                      size: buffer.length,
                      sizeInMB: (buffer.length / 1024 / 1024).toFixed(2),
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case 'download_photo': {
            const { url, filename } = args as { url: string; filename?: string };
            await fs.mkdir(this.outputDir, { recursive: true });

            const fname = filename || `photo-${Date.now()}.jpg`;
            const outputPath = path.join(this.outputDir, fname);

            const buffer = await this.client.downloadPhoto(url);
            await fs.writeFile(outputPath, buffer);

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      success: true,
                      path: outputPath,
                      size: buffer.length,
                      sizeInMB: (buffer.length / 1024 / 1024).toFixed(2),
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case 'get_rate_limit_status': {
            const status = this.client.getRateLimitStatus();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(status, null, 2),
                },
              ],
            };
          }

          case 'get_cache_stats': {
            const stats = this.client.getCacheStats();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(stats, null, 2),
                },
              ],
            };
          }

          case 'clear_cache': {
            this.client.clearCache();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ success: true, message: 'Cache cleared' }, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof PexelsError
          ? JSON.stringify(error.toJSON(), null, 2)
          : error instanceof Error
          ? error.message
          : String(error);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: true,
                  message: errorMessage,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Pexels MCP Server running on stdio');
  }
}

// Start server
async function main() {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    console.error('Error: PEXELS_API_KEY environment variable is required');
    process.exit(1);
  }

  const server = new PexelsServer({
    apiKey,
    cacheTtl: process.env.PEXELS_CACHE_TTL ? parseInt(process.env.PEXELS_CACHE_TTL) : 3600000,
    debug: process.env.PEXELS_DEBUG === 'true',
    outputDir: process.env.PEXELS_OUTPUT_DIR,
  });

  await server.run();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
