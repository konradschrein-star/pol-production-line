/**
 * YouTube SEO Metadata Generator
 * Generates optimized titles, descriptions, tags, and keywords for YouTube videos
 */

import { createAIProvider } from './index';

export interface YouTubeSEOMetadata {
  title: string; // 60 chars max, optimized for CTR
  description: string; // First 200 chars most important
  tags: string[]; // 15-20 relevant tags
  keywords: string[]; // Primary keywords for search
  hashtags: string[]; // 3-5 hashtags
  category: string;
  thumbnail_suggestions: string[];
}

const SEO_PROMPT = `You are a YouTube SEO expert. Analyze this news video script and generate optimized metadata for maximum search visibility and click-through rate.

Key requirements:
1. Title: Must be 60 characters or less, include primary keyword, compelling/clickbait
2. Description: 200-300 words, keyword-rich, structured with timestamps
3. Tags: 15-20 highly relevant tags mixing broad and specific terms
4. Keywords: 5-10 primary search keywords
5. Hashtags: 3-5 trending hashtags
6. Category: News, Politics, Technology, etc.
7. Thumbnail suggestions: 3 compelling thumbnail concepts

Return JSON in this exact format:
{
  "title": "...",
  "description": "...",
  "tags": ["...", "..."],
  "keywords": ["...", "..."],
  "hashtags": ["#...", "#..."],
  "category": "...",
  "thumbnail_suggestions": ["...", "...", "..."]
}`;

export async function generateYouTubeSEO(
  rawScript: string,
  scenes: Array<{ ticker_headline: string }>,
  provider: 'google' | 'anthropic' = 'google'
): Promise<YouTubeSEOMetadata> {
  console.log('🎯 [YouTube SEO] Generating optimized metadata...');

  // Extract key topics from ticker headlines
  const headlines = scenes.map(s => s.ticker_headline).join('\n- ');

  const userPrompt = `
Script Content:
${rawScript.substring(0, 1500)}... [${rawScript.length} characters total]

Key Headlines:
- ${headlines}

Generate YouTube SEO metadata for this news video:`;

  const aiProvider = createAIProvider(provider);

  // Use the AI provider's underlying client
  const fullPrompt = `${SEO_PROMPT}\n\n${userPrompt}`;

  // Call AI with the full prompt
  let responseText: string;

  if (provider === 'google') {
    // Use Google's Gemini API directly
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const client = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
    const model = client.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.7 },
    });

    const result = await model.generateContent(fullPrompt);
    responseText = result.response.text();
  } else {
    // Use Anthropic's Claude API
    const Anthropic = await import('@anthropic-ai/sdk');
    const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: fullPrompt }],
    });

    responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  }

  // Extract JSON from response
  const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                    responseText.match(/```\s*([\s\S]*?)\s*```/) ||
                    responseText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('AI did not return valid JSON');
  }

  const jsonText = jsonMatch[1] || jsonMatch[0];
  const metadata: YouTubeSEOMetadata = JSON.parse(jsonText.trim());

  // Validate and enforce limits
  if (metadata.title.length > 60) {
    metadata.title = metadata.title.substring(0, 57) + '...';
  }

  console.log(`✅ [YouTube SEO] Generated metadata:`);
  console.log(`   Title: "${metadata.title}" (${metadata.title.length} chars)`);
  console.log(`   Tags: ${metadata.tags.length} tags`);
  console.log(`   Keywords: ${metadata.keywords.join(', ')}`);

  return metadata;
}
