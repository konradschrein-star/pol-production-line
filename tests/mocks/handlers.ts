/**
 * MSW Request Handlers
 *
 * Mock API handlers for external services (NOT local Next.js routes)
 * CRITICAL: Only mock EXTERNAL APIs - let Next.js routes run for real
 */

import { http, HttpResponse } from 'msw';

export const handlers = [
  // ============================================================
  // Google Whisk API (Image Generation)
  // ============================================================
  http.post('https://aisandbox-pa.googleapis.com/v1/whisk:generateImage', async ({ request }) => {
    const body = (await request.json()) as any;

    // Simulate rate limiting (10% chance)
    if (Math.random() < 0.1) {
      return HttpResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Simulate content policy violation (5% chance)
    if (Math.random() < 0.05) {
      return HttpResponse.json({ error: 'Content policy violation' }, { status: 400 });
    }

    // Success response
    return HttpResponse.json({
      images: [
        {
          imageUrl: 'https://storage.googleapis.com/mock-bucket/image-123.jpg',
          width: 1024,
          height: 1024,
        },
      ],
    });
  }),

  // ============================================================
  // OpenAI API (AI Analysis)
  // ============================================================
  http.post('https://api.openai.com/v1/chat/completions', async ({ request }) => {
    const body = (await request.json()) as any;

    // Simulate token limit error (rare)
    if (Math.random() < 0.02) {
      return HttpResponse.json(
        {
          error: {
            message: 'Maximum context length exceeded',
            type: 'invalid_request_error',
          },
        },
        { status: 400 }
      );
    }

    // Mock successful analysis response
    return HttpResponse.json({
      choices: [
        {
          message: {
            role: 'assistant',
            content: JSON.stringify({
              avatar_script: 'This is a test news broadcast about automated testing.',
              scenes: [
                {
                  id: 'scene-1',
                  image_prompt: 'Dramatic news studio with large screens',
                  ticker_headline: 'BREAKING: Automated testing works',
                },
                {
                  id: 'scene-2',
                  image_prompt: 'Computer code on multiple monitors',
                  ticker_headline: 'TECH: AI-powered video production',
                },
              ],
            }),
          },
        },
      ],
    });
  }),

  // ============================================================
  // Anthropic API (Claude)
  // ============================================================
  http.post('https://api.anthropic.com/v1/messages', async ({ request }) => {
    return HttpResponse.json({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            avatar_script: 'Claude-powered news analysis test.',
            scenes: [
              {
                id: 'scene-1',
                image_prompt: 'Modern newsroom with AI displays',
                ticker_headline: 'AI: Claude analyzes news scripts',
              },
            ],
          }),
        },
      ],
    });
  }),

  // ❌ DON'T mock local Next.js API routes
  // We're TESTING these endpoints, not mocking them
  // Let http://localhost:8347/api/* run for real
];
