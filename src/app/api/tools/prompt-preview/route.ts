/**
 * POST /api/tools/prompt-preview
 * Preview how a style preset affects image prompts without creating a job
 */

import { NextRequest, NextResponse } from 'next/server';
import { stylePresetManager } from '@/lib/style-presets/manager';
import { createAIProvider } from '@/lib/ai';
import { SCRIPT_ANALYZER_SYSTEM_PROMPT, SCRIPT_ANALYZER_USER_PROMPT } from '@/lib/ai/prompts/script-analyzer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { script, stylePresetId } = body;

    // Validation
    if (!script || typeof script !== 'string') {
      return NextResponse.json(
        { error: 'Script is required' },
        { status: 400 }
      );
    }

    if (script.length < 10) {
      return NextResponse.json(
        { error: 'Script must be at least 10 characters' },
        { status: 400 }
      );
    }

    console.log(`\n🔍 [PROMPT-PREVIEW] Generating preview`);
    console.log(`   Script length: ${script.length} chars`);
    console.log(`   Style preset: ${stylePresetId || 'none'}`);

    // Build style context if preset ID provided
    let styleContext = '';
    let stylePresetName = '';

    if (stylePresetId) {
      try {
        styleContext = await stylePresetManager.buildStyleContext(stylePresetId);
        const preset = await stylePresetManager.getById(stylePresetId);
        stylePresetName = preset?.name || '';

        console.log(`✅ [PROMPT-PREVIEW] Style context loaded (${styleContext.length} chars)`);
      } catch (error) {
        console.warn(`⚠️ [PROMPT-PREVIEW] Failed to load style context:`, error);
        // Continue without style context
      }
    }

    // Create enhanced prompts with style context
    const systemPrompt = SCRIPT_ANALYZER_SYSTEM_PROMPT(styleContext || undefined);
    const userPrompt = SCRIPT_ANALYZER_USER_PROMPT(script, stylePresetName || undefined);

    // Call AI provider with enhanced prompts (using default provider from env)
    const provider = createAIProvider();
    const analysis = await provider.analyzeScriptWithContext(systemPrompt, userPrompt);

    console.log(`✅ [PROMPT-PREVIEW] Preview generated: ${analysis.scenes.length} scenes`);

    return NextResponse.json({
      success: true,
      scenes: analysis.scenes,
      style_preset_name: stylePresetName || null,
      scene_count: analysis.scenes.length,
    });
  } catch (error) {
    console.error('❌ [PROMPT-PREVIEW] Preview failed:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate preview',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
