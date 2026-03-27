/**
 * Manual Token Refresh Fallback Script
 *
 * This script provides a 3-tier fallback system for Whisk token refresh:
 * 1. Automatic refresh (Playwright browser automation)
 * 2. Semi-automatic (use existing Chrome session)
 * 3. Manual (console instructions for user)
 */

import { WhiskTokenRefresher } from '../src/lib/whisk/token-refresh';
import { WhiskTokenStore } from '../src/lib/whisk/token-store';
import chalk from 'chalk';

async function attemptAutomaticRefresh(): Promise<boolean> {
  console.log(chalk.blue('🤖 Tier 1: Attempting automatic token refresh...'));
  console.log('');

  try {
    const refresher = new WhiskTokenRefresher();
    const result = await refresher.refreshToken();

    await WhiskTokenStore.setToken(result.token);

    console.log(chalk.green('✅ SUCCESS! Token refreshed automatically'));
    console.log(chalk.gray(`   Token: ${result.token.substring(0, 30)}...`));
    console.log('');
    return true;

  } catch (error) {
    console.log(chalk.yellow('⚠️  Automatic refresh failed'));
    console.log(chalk.gray(`   Error: ${error instanceof Error ? error.message : String(error)}`));
    console.log('');
    return false;
  }
}

async function attemptSemiAutomaticRefresh(): Promise<boolean> {
  console.log(chalk.blue('🌐 Tier 2: Semi-automatic refresh (using your existing Chrome)'));
  console.log('');
  console.log(chalk.cyan('Instructions:'));
  console.log('1. Make sure Chrome is open and you are signed into Google');
  console.log('2. Browser will open Whisk automatically');
  console.log('3. Token will be captured from network request');
  console.log('');
  console.log(chalk.gray('Press Ctrl+C to skip to manual fallback...'));
  console.log('');

  // Wait 3 seconds for user to read
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    // Try with headless=false (visible browser)
    process.env.WHISK_TOKEN_REFRESH_HEADLESS = 'false';

    const refresher = new WhiskTokenRefresher();
    const result = await refresher.refreshToken();

    await WhiskTokenStore.setToken(result.token);

    console.log(chalk.green('✅ SUCCESS! Token captured from browser'));
    console.log(chalk.gray(`   Token: ${result.token.substring(0, 30)}...`));
    console.log('');
    return true;

  } catch (error) {
    console.log(chalk.yellow('⚠️  Semi-automatic refresh failed'));
    console.log(chalk.gray(`   Error: ${error instanceof Error ? error.message : String(error)}`));
    console.log('');
    return false;
  }
}

function showManualInstructions(): void {
  console.log(chalk.blue('📝 Tier 3: Manual Token Refresh'));
  console.log('');
  console.log(chalk.bold('Please follow these steps:'));
  console.log('');

  console.log(chalk.cyan('1. Open Google Chrome:'));
  console.log('   https://labs.google.com/whisk');
  console.log('');

  console.log(chalk.cyan('2. Open Developer Tools:'));
  console.log('   Press F12 or Right-click → Inspect');
  console.log('');

  console.log(chalk.cyan('3. Go to Network Tab:'));
  console.log('   Click on "Network" tab at the top');
  console.log('');

  console.log(chalk.cyan('4. Generate a Test Image:'));
  console.log('   - Click "Surprise me" button OR');
  console.log('   - Enter any prompt and click "Generate"');
  console.log('');

  console.log(chalk.cyan('5. Find the API Request:'));
  console.log('   - Look for request named "generateImage" or similar');
  console.log('   - Click on it to open details');
  console.log('');

  console.log(chalk.cyan('6. Copy the Authorization Token:'));
  console.log('   - Scroll to "Request Headers" section');
  console.log('   - Find "Authorization: Bearer ya29.a0..."');
  console.log('   - Copy EVERYTHING after "Bearer " (starts with ya29)');
  console.log('');

  console.log(chalk.cyan('7. Update the .env file:'));
  console.log(chalk.gray('   C:\\Users\\konra\\OneDrive\\Projekte\\20260319 Political content automation\\obsidian-news-desk\\.env'));
  console.log('');
  console.log('   Find this line:');
  console.log(chalk.gray('   WHISK_API_TOKEN=ya29.a0...'));
  console.log('');
  console.log('   Replace with your new token:');
  console.log(chalk.gray('   WHISK_API_TOKEN=ya29.a0[YOUR_NEW_TOKEN_HERE]'));
  console.log('');

  console.log(chalk.cyan('8. Restart the system:'));
  console.log('   Run: STOP.bat && START.bat');
  console.log('   Or just create a new job (system auto-picks up new token)');
  console.log('');

  console.log(chalk.yellow('⏱️  Note: Whisk tokens expire after ~1 hour'));
  console.log(chalk.yellow('   You may need to refresh again later'));
  console.log('');
}

async function main() {
  console.log('');
  console.log(chalk.bold.white('╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.white('║    Whisk Token Refresh - 3-Tier Fallback System       ║'));
  console.log(chalk.bold.white('╚════════════════════════════════════════════════════════╝'));
  console.log('');

  // Show current status
  const info = WhiskTokenStore.getExpirationInfo();
  console.log(chalk.gray('Current token status:'));
  console.log(chalk.gray(`  Expired: ${info.isExpired ? 'YES' : 'NO'}`));
  console.log(chalk.gray(`  Time left: ${Math.floor(info.timeRemaining / 1000 / 60)} minutes`));
  console.log('');

  // Tier 1: Automatic refresh
  const tier1Success = await attemptAutomaticRefresh();
  if (tier1Success) {
    console.log(chalk.green.bold('🎉 Token refreshed successfully! You can now create jobs.'));
    process.exit(0);
  }

  // Tier 2: Semi-automatic refresh (visible browser)
  const tier2Success = await attemptSemiAutomaticRefresh();
  if (tier2Success) {
    console.log(chalk.green.bold('🎉 Token refreshed successfully! You can now create jobs.'));
    process.exit(0);
  }

  // Tier 3: Manual instructions
  showManualInstructions();

  console.log(chalk.red.bold('❌ Automatic and semi-automatic refresh failed.'));
  console.log(chalk.yellow('   Please follow the manual instructions above.'));
  console.log('');

  process.exit(1);
}

main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
