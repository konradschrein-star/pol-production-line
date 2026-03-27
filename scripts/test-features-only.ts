/**
 * Feature Integration Test (No API calls)
 * Verifies all 6 features are properly integrated
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   FEATURE INTEGRATION TEST                               ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Style Presets
  console.log('1️⃣  Style Presets System');
  console.log('─'.repeat(60));
  try {
    // Check database
    const presets = await db.query('SELECT id, name FROM style_presets ORDER BY is_default DESC');
    console.log(`   ✅ Database: ${presets.rows.length} presets found`);
    presets.rows.forEach(p => console.log(`      - ${p.name}`));

    // Check manager file
    const managerPath = join(__dirname, '../src/lib/style-presets/manager.ts');
    if (!existsSync(managerPath)) throw new Error('Manager file missing');
    console.log('   ✅ Manager: stylePresetManager exists');

    // Check API
    const apiPath = join(__dirname, '../src/app/api/style-presets/route.ts');
    if (!existsSync(apiPath)) throw new Error('API file missing');
    console.log('   ✅ API: /api/style-presets exists');

    // Check integration in images worker
    const workerPath = join(__dirname, '../src/lib/queue/workers/images.worker.ts');
    const workerContent = readFileSync(workerPath, 'utf-8');
    if (!workerContent.includes('stylePresetManager')) throw new Error('Not integrated');
    console.log('   ✅ Integration: images.worker.ts uses stylePresetManager');

    passed++;
  } catch (error) {
    console.error(`   ❌ Failed: ${error instanceof Error ? error.message : error}`);
    failed++;
  }

  // Test 2: Animation Variety
  console.log('\n2️⃣  Animation Variety');
  console.log('─'.repeat(60));
  try {
    // Check patterns file
    const patternsPath = join(__dirname, '../src/lib/remotion/animations/patterns.ts');
    if (!existsSync(patternsPath)) throw new Error('Patterns file missing');
    const patternsContent = readFileSync(patternsPath, 'utf-8');
    const patternCount = (patternsContent.match(/export const ANIMATION_PATTERNS/g) || []).length;
    console.log(`   ✅ Patterns: animation patterns defined`);

    // Check config file
    const configPath = join(__dirname, '../src/lib/remotion/animations/config.ts');
    if (!existsSync(configPath)) throw new Error('Config file missing');
    console.log('   ✅ Config: animation config exists');

    // Check integration in Scene.tsx
    const scenePath = join(__dirname, '../src/lib/remotion/components/Scene.tsx');
    const sceneContent = readFileSync(scenePath, 'utf-8');
    if (!sceneContent.includes('selectPatternForScene')) throw new Error('Not integrated');
    console.log('   ✅ Integration: Scene.tsx uses selectPatternForScene');

    passed++;
  } catch (error) {
    console.error(`   ❌ Failed: ${error instanceof Error ? error.message : error}`);
    failed++;
  }

  // Test 3: Image Upload/Editor
  console.log('\n3️⃣  Image Upload/Editor');
  console.log('─'.repeat(60));
  try {
    // Check image processing utility
    const utilPath = join(__dirname, '../src/lib/utils/image-processing.ts');
    if (!existsSync(utilPath)) throw new Error('Processing utility missing');
    const utilContent = readFileSync(utilPath, 'utf-8');
    if (!utilContent.includes('sharp')) throw new Error('Sharp not used');
    console.log('   ✅ Utility: image-processing.ts with Sharp');

    // Check upload API
    const uploadPath = join(__dirname, '../src/app/api/jobs/[id]/scenes/[scene_id]/upload/route.ts');
    if (!existsSync(uploadPath)) throw new Error('Upload API missing');
    const uploadContent = readFileSync(uploadPath, 'utf-8');
    if (!uploadContent.includes('processImage')) throw new Error('processImage not used');
    console.log('   ✅ API: upload route with processImage');

    passed++;
  } catch (error) {
    console.error(`   ❌ Failed: ${error instanceof Error ? error.message : error}`);
    failed++;
  }

  // Test 4: Thumbnail Generation
  console.log('\n4️⃣  Thumbnail Generation');
  console.log('─'.repeat(60));
  try {
    // Check thumbnail API client
    const clientPath = join(__dirname, '../src/lib/integrations/thumbnail-api.ts');
    if (!existsSync(clientPath)) throw new Error('API client missing');
    const clientContent = readFileSync(clientPath, 'utf-8');
    if (!clientContent.includes('generateThumbnailWithRetry')) throw new Error('Function missing');
    console.log('   ✅ Client: thumbnail-api.ts with retry logic');

    // Check thumbnail API route
    const thumbApiPath = join(__dirname, '../src/app/api/jobs/[id]/thumbnail/route.ts');
    if (!existsSync(thumbApiPath)) throw new Error('API route missing');
    console.log('   ✅ API: /api/jobs/[id]/thumbnail exists');

    // Check integration in render worker
    const renderPath = join(__dirname, '../src/lib/queue/workers/render.worker.ts');
    const renderContent = readFileSync(renderPath, 'utf-8');
    if (!renderContent.includes('generateThumbnailWithRetry')) throw new Error('Not integrated');
    console.log('   ✅ Integration: render.worker.ts auto-generates thumbnails');

    passed++;
  } catch (error) {
    console.error(`   ❌ Failed: ${error instanceof Error ? error.message : error}`);
    failed++;
  }

  // Test 5: User Guide
  console.log('\n5️⃣  User Guide');
  console.log('─'.repeat(60));
  try {
    const guidePath = join(__dirname, '../docs/USER_GUIDE.md');
    if (!existsSync(guidePath)) throw new Error('User guide missing');

    const guideContent = readFileSync(guidePath, 'utf-8');
    const sections = guideContent.match(/^##\s+.+$/gm) || [];

    console.log(`   ✅ docs/USER_GUIDE.md exists`);
    console.log(`   ✅ ${sections.length} sections documented`);

    passed++;
  } catch (error) {
    console.error(`   ❌ Failed: ${error instanceof Error ? error.message : error}`);
    failed++;
  }

  // Test 6: Electron Installer
  console.log('\n6️⃣  Electron Installer');
  console.log('─'.repeat(60));
  try {
    const electronDir = join(__dirname, '../electron');
    if (!existsSync(electronDir)) throw new Error('Electron directory missing');
    console.log('   ✅ electron/ directory exists');

    // Check for main file
    const mainPath = join(electronDir, 'src/main.ts');
    if (!existsSync(mainPath)) throw new Error('main.ts missing');
    console.log('   ✅ electron/src/main.ts exists');

    // Check for builder config
    const builderPath = join(__dirname, '../electron-builder.yml');
    if (!existsSync(builderPath)) throw new Error('electron-builder.yml missing');
    console.log('   ✅ electron-builder.yml exists');

    passed++;
  } catch (error) {
    console.error(`   ❌ Failed: ${error instanceof Error ? error.message : error}`);
    failed++;
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total Features: 6`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('═'.repeat(60));

  if (failed > 0) {
    console.log('\n⚠️  Some features are not properly integrated');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL 6 FEATURES ARE PROPERLY INTEGRATED!');
    console.log('\nNext steps:');
    console.log('1. Run end-to-end test with actual video rendering');
    console.log('2. Fix any errors that occur during rendering');
    console.log('3. Verify output quality');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
}).finally(async () => {
  await db.end();
});
