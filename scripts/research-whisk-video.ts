/**
 * Research Script: Google Whisk Video Generation API
 *
 * This script tests various potential Whisk video API endpoints
 * to determine if video generation is supported.
 *
 * Usage:
 *   npm run research:whisk-video
 *
 * Prerequisites:
 *   - WHISK_API_TOKEN set in .env
 *   - Active bearer token from labs.google.com/whisk
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface TestEndpoint {
  name: string;
  url: string;
  payload: any;
}

async function testWhiskVideoEndpoints() {
  const token = process.env.WHISK_API_TOKEN;

  if (!token) {
    console.error('❌ WHISK_API_TOKEN not set in .env file');
    process.exit(1);
  }

  console.log('🔬 [RESEARCH] Starting Whisk Video API Research\n');
  console.log(`📋 Testing ${endpoints.length} potential endpoints...\n`);

  const endpoints: TestEndpoint[] = [
    // Endpoint 1: Direct video generation (modeled after image endpoint)
    {
      name: 'whisk:generateVideo (direct)',
      url: 'https://aisandbox-pa.googleapis.com/v1/whisk:generateVideo',
      payload: {
        clientContext: {
          workflowId: `research_${Date.now()}`,
          tool: 'BACKBONE',
          sessionId: `;${Date.now()}`,
        },
        videoModelSettings: {
          videoModel: 'VIDEO_FX_1',
          aspectRatio: 'VIDEO_ASPECT_RATIO_LANDSCAPE',
          duration: 3,
          fps: 24,
        },
        prompt: 'A sunset over mountains, camera panning slowly',
        seed: Date.now(),
      },
    },

    // Endpoint 2: VideoFX endpoint
    {
      name: 'videoFx:generate',
      url: 'https://aisandbox-pa.googleapis.com/v1/videoFx:generate',
      payload: {
        prompt: 'A sunset over mountains',
        duration: 3,
      },
    },

    // Endpoint 3: Generic runVideoFx
    {
      name: 'runVideoFx',
      url: 'https://aisandbox-pa.googleapis.com/v1:runVideoFx',
      payload: {
        prompt: 'A sunset over mountains',
        duration: 3,
      },
    },

    // Endpoint 4: Whisk video with image model settings (test compatibility)
    {
      name: 'whisk:generateVideo (image payload)',
      url: 'https://aisandbox-pa.googleapis.com/v1/whisk:generateVideo',
      payload: {
        clientContext: {
          workflowId: `research_${Date.now()}`,
          tool: 'BACKBONE',
          sessionId: `;${Date.now()}`,
        },
        imageModelSettings: {
          imageModel: 'IMAGEN_3_5',
          aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE',
        },
        mediaCategory: 'MEDIA_CATEGORY_VIDEO',
        prompt: 'A sunset over mountains',
        seed: Math.floor(Math.random() * 1000000),
      },
    },

    // Endpoint 5: Generic generate with mediaType
    {
      name: 'whisk:generate (video mediaType)',
      url: 'https://aisandbox-pa.googleapis.com/v1/whisk:generate',
      payload: {
        mediaType: 'video',
        prompt: 'A sunset over mountains',
        duration: 3,
      },
    },
  ];

  const results: Array<{
    endpoint: string;
    status: 'success' | 'not_found' | 'unauthorized' | 'error';
    statusCode?: number;
    message: string;
    response?: any;
  }> = [];

  for (const endpoint of endpoints) {
    console.log(`\n🧪 Testing: ${endpoint.name}`);
    console.log(`📍 URL: ${endpoint.url}`);

    try {
      const response = await axios.post(
        endpoint.url,
        endpoint.payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Referer': 'https://labs.google/',
          },
          timeout: 30000,
        }
      );

      console.log('✅ SUCCESS! Response received:');
      console.log(JSON.stringify(response.data, null, 2));

      results.push({
        endpoint: endpoint.name,
        status: 'success',
        statusCode: response.status,
        message: 'Endpoint responded successfully',
        response: response.data,
      });

    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;

        if (status === 404) {
          console.log('❌ 404 Not Found - Endpoint does not exist');
          results.push({
            endpoint: endpoint.name,
            status: 'not_found',
            statusCode: 404,
            message: 'Endpoint not found',
          });
        } else if (status === 401 || status === 403) {
          console.log('⚠️  401/403 Unauthorized - May require different permissions');
          results.push({
            endpoint: endpoint.name,
            status: 'unauthorized',
            statusCode: status,
            message: 'Authentication/permission error',
            response: error.response.data,
          });
        } else {
          console.log(`❌ ${status}: ${error.response.statusText}`);
          console.log('Response:', JSON.stringify(error.response.data, null, 2));
          results.push({
            endpoint: endpoint.name,
            status: 'error',
            statusCode: status,
            message: error.response.statusText,
            response: error.response.data,
          });
        }
      } else {
        console.log(`❌ Error: ${error.message}`);
        results.push({
          endpoint: endpoint.name,
          status: 'error',
          message: error.message,
        });
      }
    }
  }

  // Generate summary report
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESEARCH SUMMARY');
  console.log('='.repeat(60) + '\n');

  const successCount = results.filter(r => r.status === 'success').length;
  const notFoundCount = results.filter(r => r.status === 'not_found').length;
  const unauthorizedCount = results.filter(r => r.status === 'unauthorized').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Not Found: ${notFoundCount}`);
  console.log(`⚠️  Unauthorized: ${unauthorizedCount}`);
  console.log(`🔥 Error: ${errorCount}`);

  // Save detailed report
  const reportPath = path.join(__dirname, '..', 'docs', 'WHISK_VIDEO_RESEARCH.md');
  const reportContent = generateMarkdownReport(results);

  fs.writeFileSync(reportPath, reportContent, 'utf-8');
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  // Conclusion
  console.log('\n' + '='.repeat(60));
  console.log('🔬 CONCLUSION');
  console.log('='.repeat(60) + '\n');

  if (successCount > 0) {
    console.log('✅ Video generation appears to be SUPPORTED!');
    console.log('🎉 Proceed with Phase 2 implementation.');
    console.log('📋 Check the report for implementation details.');
  } else if (unauthorizedCount > 0) {
    console.log('⚠️  Some endpoints exist but require different permissions.');
    console.log('📧 Consider contacting Google AI team for access.');
  } else {
    console.log('❌ Video generation does NOT appear to be supported yet.');
    console.log('💡 Recommendations:');
    console.log('   1. Continue using static images');
    console.log('   2. Monitor Whisk updates for video support');
    console.log('   3. Consider alternative: ffmpeg motion post-processing');
  }

  console.log('\n');
}

function generateMarkdownReport(results: any[]): string {
  const timestamp = new Date().toISOString();

  let report = `# Whisk Video Generation API Research\n\n`;
  report += `**Date:** ${timestamp}\n\n`;
  report += `**Objective:** Determine if Google Whisk API supports video generation\n\n`;
  report += `## Results Summary\n\n`;

  const successCount = results.filter(r => r.status === 'success').length;
  const notFoundCount = results.filter(r => r.status === 'not_found').length;
  const unauthorizedCount = results.filter(r => r.status === 'unauthorized').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  report += `- ✅ Successful: ${successCount}\n`;
  report += `- ❌ Not Found: ${notFoundCount}\n`;
  report += `- ⚠️  Unauthorized: ${unauthorizedCount}\n`;
  report += `- 🔥 Error: ${errorCount}\n\n`;

  report += `## Endpoint Tests\n\n`;

  for (const result of results) {
    const statusIcon = {
      success: '✅',
      not_found: '❌',
      unauthorized: '⚠️',
      error: '🔥',
    }[result.status];

    report += `### ${statusIcon} ${result.endpoint}\n\n`;
    report += `- **Status:** ${result.status}\n`;
    report += `- **HTTP Code:** ${result.statusCode || 'N/A'}\n`;
    report += `- **Message:** ${result.message}\n\n`;

    if (result.response) {
      report += `**Response:**\n\`\`\`json\n${JSON.stringify(result.response, null, 2)}\n\`\`\`\n\n`;
    }
  }

  report += `## Conclusion\n\n`;

  if (successCount > 0) {
    report += `✅ **Video generation is SUPPORTED!**\n\n`;
    report += `Proceed with Phase 2 implementation. Use the successful endpoint(s) as reference.\n\n`;
  } else if (unauthorizedCount > 0) {
    report += `⚠️ **Endpoints exist but require permissions.**\n\n`;
    report += `Contact Google AI Labs team for potential access.\n\n`;
  } else {
    report += `❌ **Video generation is NOT supported.**\n\n`;
    report += `**Recommendations:**\n`;
    report += `1. Continue using static images\n`;
    report += `2. Monitor Whisk for future video support\n`;
    report += `3. Consider alternative: ffmpeg-based motion effects\n\n`;
  }

  report += `## Next Steps\n\n`;
  report += `- [ ] Review this report\n`;
  report += `- [ ] Decide on implementation approach\n`;
  report += `- [ ] Update CLAUDE.md with findings\n`;
  report += `- [ ] Implement video support (if viable)\n`;

  return report;
}

// Run the research
testWhiskVideoEndpoints().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
