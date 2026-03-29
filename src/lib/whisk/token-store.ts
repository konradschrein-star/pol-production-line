/**
 * Whisk Token Store - Centralized token management
 *
 * Manages Whisk API bearer tokens with:
 * - In-memory cache for fast access
 * - .env file persistence
 * - Expiration tracking (tokens expire after ~60 minutes)
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const GOOGLE_OAUTH_TOKEN_PATTERN = /^ya29\.[a-zA-Z0-9_-]{100,}$/;
const TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 60 minutes
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minute safety buffer

export class WhiskTokenStore {
  private static currentToken: string | null = null;
  private static lastRefreshTime: number | null = null;

  /**
   * Get the current token from memory cache or .env
   */
  static getToken(): string {
    // Return cached token if available
    if (this.currentToken) {
      return this.currentToken;
    }

    // Load from environment
    const envToken = process.env.WHISK_API_TOKEN;
    if (envToken) {
      this.currentToken = envToken;
      return envToken;
    }

    throw new Error('WHISK_API_TOKEN not found in environment or cache');
  }

  /**
   * Update token in both memory and .env file
   */
  static async setToken(token: string): Promise<void> {
    // Validate token format
    if (!GOOGLE_OAUTH_TOKEN_PATTERN.test(token)) {
      throw new Error(
        `Invalid Google OAuth token format. Expected pattern: ya29.[100+ chars], got: ${token.substring(0, 20)}...`
      );
    }

    // Update in-memory cache
    this.currentToken = token;
    this.lastRefreshTime = Date.now();

    console.log(`✅ [Token Store] Token updated in memory (expires ~${new Date(Date.now() + TOKEN_LIFETIME_MS).toLocaleTimeString()})`);

    // Update .env file
    await this.updateEnvFile(token);

    // Update process.env for current runtime
    process.env.WHISK_API_TOKEN = token;
  }

  /**
   * Check if the current token is likely expired
   * Returns true if token is >55 minutes old (5 min buffer before 60 min expiry)
   */
  static isTokenExpired(): boolean {
    if (!this.lastRefreshTime) {
      // Don't know when it was refreshed - assume it might be expired
      return false; // Conservative: don't force refresh if we're unsure
    }

    const age = Date.now() - this.lastRefreshTime;
    const expiryThreshold = TOKEN_LIFETIME_MS - TOKEN_EXPIRY_BUFFER_MS;

    return age > expiryThreshold;
  }

  /**
   * Clear the token cache (useful for testing)
   */
  static clearCache(): void {
    this.currentToken = null;
    this.lastRefreshTime = null;
  }

  /**
   * Get time in milliseconds until token is expected to expire
   * Returns negative number if already expired
   */
  static getTimeUntilExpiration(): number {
    if (!this.lastRefreshTime) {
      return 0; // Unknown
    }

    const age = Date.now() - this.lastRefreshTime;
    return TOKEN_LIFETIME_MS - age;
  }

  /**
   * Update .env file with new token
   * Safely updates the file by:
   * 1. Reading entire file
   * 2. Replacing WHISK_API_TOKEN line
   * 3. Adding timestamp comment
   * 4. Writing atomically (temp file + rename)
   */
  private static async updateEnvFile(token: string): Promise<void> {
    try {
      const projectRoot = path.resolve(__dirname, '../../..');
      const envPath = path.join(projectRoot, '.env');

      // Read current .env file
      let envContent: string;
      try {
        envContent = await fs.readFile(envPath, 'utf-8');
      } catch (error) {
        console.warn('⚠️  [Token Store] .env file not found, creating new one');
        envContent = '';
      }

      // Prepare new token line with timestamp
      const timestamp = new Date().toISOString();
      const newTokenLine = `WHISK_API_TOKEN=${token}`;
      const timestampComment = `# Last refreshed: ${timestamp}`;

      // Replace existing WHISK_API_TOKEN line (and its timestamp comment if present)
      const tokenRegex = /^#\s*Last refreshed:.*\n?WHISK_API_TOKEN=.*/m;
      const simpleTokenRegex = /^WHISK_API_TOKEN=.*/m;

      let updatedContent: string;
      if (tokenRegex.test(envContent)) {
        // Replace both comment and token line
        updatedContent = envContent.replace(
          tokenRegex,
          `${timestampComment}\n${newTokenLine}`
        );
      } else if (simpleTokenRegex.test(envContent)) {
        // Replace just token line, add comment
        updatedContent = envContent.replace(
          simpleTokenRegex,
          `${timestampComment}\n${newTokenLine}`
        );
      } else {
        // Token doesn't exist, append to end
        updatedContent = envContent.trim() + '\n\n' + timestampComment + '\n' + newTokenLine + '\n';
      }

      // Write atomically: temp file → rename
      const tempPath = envPath + '.tmp';
      await fs.writeFile(tempPath, updatedContent, 'utf-8');
      await fs.rename(tempPath, envPath);

      console.log(`✅ [Token Store] .env file updated: ${envPath}`);

    } catch (error) {
      console.error('❌ [Token Store] Failed to update .env file:', error);
      throw new Error(`Failed to persist token to .env: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get timestamp of last token update
   * Returns 0 if no token has been set yet
   */
  static getLastUpdateTime(): number {
    return this.lastRefreshTime || 0;
  }

  /**
   * Get formatted expiration info for logging/UI
   */
  static getExpirationInfo(): {
    isExpired: boolean;
    timeRemaining: number;
    expiresAt: Date | null;
  } {
    const timeRemaining = this.getTimeUntilExpiration();
    const isExpired = this.isTokenExpired();

    return {
      isExpired,
      timeRemaining,
      expiresAt: this.lastRefreshTime
        ? new Date(this.lastRefreshTime + TOKEN_LIFETIME_MS)
        : null,
    };
  }
}
