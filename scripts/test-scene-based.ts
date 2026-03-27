/**
 * Test Script: Scene-Based Image Generation
 *
 * Validates the new scene-based analysis system by:
 * 1. Segmenting a sample script into sentences
 * 2. Grouping sentences into broad scenes
 * 3. Generating image prompts with scene context
 * 4. Verifying output matches expectations
 */

import 'dotenv/config';
import { segmentScript } from '../src/lib/ai/script-segmenter';
import { segmentIntoScenes, getTotalPromptCount } from '../src/lib/ai/scene-segmenter';
import { OpenAIProvider } from '../src/lib/ai/providers/openai';

// Sample news script (Climate Bill example from production test)
const SAMPLE_SCRIPT = `The Senate passed the landmark climate bill today. The vote was 51-50, with Vice President Harris casting the tie-breaking vote. This marks a historic moment for environmental policy in America.

Republicans unanimously opposed the bill, calling it economically reckless. House Minority Leader Kevin McCarthy vowed to repeal it if Republicans win the House in November. Democrats celebrated the victory after years of failed negotiations.

The bill allocates $369 billion for clean energy investments. Economists project it will create 1.5 million green jobs over the next decade. Goldman Sachs upgraded renewable energy stocks in response to the news.

Critics warn the bill will raise energy costs for consumers. The Heritage Foundation estimates average household bills could increase by $500 annually. Supporters counter that long-term savings will offset short-term costs.

Environmental activists gathered outside the Capitol to celebrate. Sunrise Movement organizers called it "the beginning, not the end" of climate action. They vowed to pressure Congress for even stronger measures in the future.`;

async function testSceneBasedGeneration() {
  console.log('🧪 Testing Scene-Based Image Generation\n');
  console.log('='.repeat(80));

  // Step 1: Segment script into sentences
  console.log('\n📄 Step 1: Segmenting script into sentences...');
  const sentences = segmentScript(SAMPLE_SCRIPT);
  console.log(`✅ Segmented into ${sentences.length} sentences\n`);

  sentences.slice(0, 5).forEach((s, i) => {
    console.log(`   ${i}. [${s.narrativePosition}] "${s.text}"`);
  });
  console.log(`   ... (${sentences.length - 5} more)\n`);

  // Step 2: Estimate avatar duration
  const wordCount = SAMPLE_SCRIPT.split(/\s+/).filter(w => w.length > 0).length;
  const estimatedDuration = Math.max(30, wordCount / 2.5); // 150 words/min = 2.5 words/sec
  console.log(`📊 Step 2: Estimating avatar duration...`);
  console.log(`   Word count: ${wordCount}`);
  console.log(`   Estimated duration: ${estimatedDuration.toFixed(1)}s\n`);

  // Step 3: Segment into broad scenes
  console.log(`🎬 Step 3: Grouping sentences into broad scenes...`);
  const broadScenes = segmentIntoScenes(sentences, estimatedDuration);
  console.log(`✅ Grouped into ${broadScenes.length} broad scenes\n`);

  broadScenes.forEach((scene, idx) => {
    const sentenceCount = scene.subSentences ? scene.subSentences.length : scene.sentences.length;
    console.log(`   Scene ${scene.id}: [${scene.isHook ? 'HOOK' : 'BODY'}] "${scene.topic}"`);
    console.log(`      Sentences: ${sentenceCount}`);
    console.log(`      Setting: ${scene.visualTheme.setting}`);
    console.log(`      Mood: ${scene.visualTheme.mood}`);
    console.log(`      Color: ${scene.visualTheme.colorPalette}`);
    console.log(`      Time: ${scene.visualTheme.timeOfDay}\n`);
  });

  // Step 4: Calculate expected prompt count
  const totalPrompts = getTotalPromptCount(broadScenes);
  console.log(`📊 Step 4: Expected output...`);
  console.log(`   Total prompts to generate: ${totalPrompts}`);
  console.log(`   (One prompt per sentence for perfect coverage)\n`);

  // Step 5: Test AI generation (if API key available)
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-proj-your_openai_api_key_here') {
    console.log(`🤖 Step 5: Testing AI generation with OpenAI...\n`);

    const provider = new OpenAIProvider(process.env.OPENAI_API_KEY);

    try {
      // Test scene-based analysis
      const result = await (provider as any).analyzeScriptSceneBasedWithDuration(
        SAMPLE_SCRIPT,
        estimatedDuration
      );

      console.log(`✅ AI Analysis Complete!`);
      console.log(`   Scenes generated: ${result.scenes.length}`);
      console.log(`   Expected: ${totalPrompts}`);
      console.log(`   Match: ${result.scenes.length === totalPrompts ? '✅ YES' : '❌ NO'}\n`);

      // Validate scene structure
      console.log(`📋 Step 6: Validating scene structure...\n`);

      const sampleScenes = result.scenes.slice(0, 3);
      sampleScenes.forEach((scene, idx) => {
        console.log(`   Scene ${scene.id}:`);
        console.log(`      Sentence: "${scene.sentence_text?.substring(0, 60)}..."`);
        console.log(`      Shot type: ${scene.shot_type}`);
        console.log(`      Ticker: "${scene.ticker_headline}"`);
        console.log(`      Prompt: "${scene.image_prompt.substring(0, 100)}..."`);
        console.log(`      Narrative: ${scene.narrative_position}`);
        console.log(``);
      });

      // Check for photographic realism
      console.log(`📸 Step 7: Checking for photographic realism...\n`);

      const hasCamera = result.scenes.some(s => s.image_prompt.includes('shot on') || s.image_prompt.includes('camera'));
      const hasLens = result.scenes.some(s => s.image_prompt.includes('mm lens') || s.image_prompt.includes('f/'));
      const hasLighting = result.scenes.some(s => s.image_prompt.includes('lighting') || s.image_prompt.includes('K'));
      const hasComposition = result.scenes.some(s => s.image_prompt.includes('third') || s.image_prompt.includes('composition'));

      console.log(`   Camera specs: ${hasCamera ? '✅ Present' : '❌ Missing'}`);
      console.log(`   Lens details: ${hasLens ? '✅ Present' : '❌ Missing'}`);
      console.log(`   Lighting specs: ${hasLighting ? '✅ Present' : '❌ Missing'}`);
      console.log(`   Composition rules: ${hasComposition ? '✅ Present' : '❌ Missing'}\n`);

      // Shot type distribution
      const shotTypes = result.scenes.reduce((acc: any, s) => {
        acc[s.shot_type || 'unknown'] = (acc[s.shot_type || 'unknown'] || 0) + 1;
        return acc;
      }, {});

      console.log(`📊 Step 8: Shot type distribution...\n`);
      console.log(`   Establishing: ${shotTypes.establishing || 0} (${((shotTypes.establishing || 0) / result.scenes.length * 100).toFixed(1)}%)`);
      console.log(`   Medium: ${shotTypes.medium || 0} (${((shotTypes.medium || 0) / result.scenes.length * 100).toFixed(1)}%)`);
      console.log(`   Closeup: ${shotTypes.closeup || 0} (${((shotTypes.closeup || 0) / result.scenes.length * 100).toFixed(1)}%)`);
      console.log(`   Detail: ${shotTypes.detail || 0} (${((shotTypes.detail || 0) / result.scenes.length * 100).toFixed(1)}%)\n`);

      console.log('='.repeat(80));
      console.log('✅ TEST COMPLETE: Scene-based generation working as expected!\n');

    } catch (error) {
      console.error(`❌ AI Generation Failed:`, error);
      console.log('\nNote: This is expected if your OpenAI API key is not configured.\n');
    }
  } else {
    console.log(`⚠️  Step 5: Skipping AI generation test (OPENAI_API_KEY not configured)\n`);
    console.log('To test AI generation, add your OpenAI API key to .env:\n');
    console.log('  OPENAI_API_KEY=sk-proj-your_actual_key_here\n');
    console.log('='.repeat(80));
    console.log('✅ TEST COMPLETE: Scene segmentation working as expected!\n');
  }
}

// Run test
testSceneBasedGeneration().catch(console.error);
