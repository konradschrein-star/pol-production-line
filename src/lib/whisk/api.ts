/**
 * Whisk API Client - Direct API calls using bearer token
 *
 * Much simpler than browser automation - just use your auth token!
 *
 * Setup:
 * 1. Open https://labs.google.com/whisk in your browser
 * 2. Press F12 → Network tab
 * 3. Generate a test image
 * 4. Find the request to "generate" or similar
 * 5. Look for Authorization header: "Bearer XXX..."
 * 6. Copy the token after "Bearer " and add to .env as WHISK_API_TOKEN
 */

import axios from 'axios';
import {
  WhiskImageGenerateRequest,
  WhiskVideoGenerateRequest,
  WhiskGenerateResponse,
  WhiskReferenceImages,
} from './types';
import { WhiskTokenStore } from './token-store';
import { WhiskTokenRefresher } from './token-refresh';
import { TokenRefreshLock } from './token-refresh-lock';

// Legacy export for backward compatibility
export interface WhiskGenerateRequest {
  prompt: string;
  aspectRatio?: 'IMAGE_ASPECT_RATIO_SQUARE' | 'IMAGE_ASPECT_RATIO_LANDSCAPE' | 'IMAGE_ASPECT_RATIO_PORTRAIT' | 'IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE' | 'IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR';
  numImages?: number;
}

// Re-export types
export type { WhiskImageGenerateRequest, WhiskGenerateResponse, WhiskReferenceImages }

export class WhiskAPIClient {
  private bearerToken: string;
  // ✅ FIX: Make API endpoint configurable via environment variable
  private apiUrl: string = process.env.WHISK_API_ENDPOINT || 'https://aisandbox-pa.googleapis.com/v1/whisk:generateImage';

  constructor(bearerToken?: string) {
    // Priority: parameter > token store > environment
    this.bearerToken = bearerToken || WhiskTokenStore.getToken();

    if (!this.bearerToken) {
      throw new Error('WHISK_API_TOKEN not set in environment variables');
    }

    // Log configured endpoint (helps with debugging)
    if (process.env.WHISK_API_ENDPOINT) {
      console.log(`🔧 [Whisk] Using custom API endpoint: ${this.apiUrl}`);
    }
  }

  /**
   * Refresh token automatically using browser extension (preferred) or browser automation (fallback)
   * Updates both in-memory cache and .env file
   */
  private async refreshTokenAndRetry(): Promise<void> {
    const isEnabled = process.env.WHISK_TOKEN_REFRESH_ENABLED !== 'false'; // Default: enabled
    const useExtension = process.env.WHISK_USE_EXTENSION !== 'false'; // Default: enabled

    if (!isEnabled) {
      console.error('⚠️  [Whisk API] Automatic token refresh is disabled (WHISK_TOKEN_REFRESH_ENABLED=false)');
      throw new Error('Token expired and automatic refresh is disabled');
    }

    console.log('🔄 [Whisk API] Token expired, attempting automatic refresh...');

    try {
      // Use lock to prevent concurrent refresh operations
      const token = await TokenRefreshLock.refresh(async () => {
        // Try extension first (faster, more reliable)
        if (useExtension) {
          console.log('🔌 [Whisk API] Attempting extension-based token refresh...');
          const { triggerExtensionRefresh, isExtensionAvailable } = await import('./extension-integration');

          // Check if extension is available
          const extensionAvailable = await isExtensionAvailable();

          if (extensionAvailable) {
            const result = await triggerExtensionRefresh(15000); // 15 second timeout

            if (result.success && result.token) {
              console.log('✅ [Whisk API] Extension refresh successful');
              return result.token;
            } else {
              console.warn('⚠️  [Whisk API] Extension refresh failed:', result.error);
              console.log('🔄 [Whisk API] Falling back to browser automation...');
            }
          } else {
            console.log('⚠️  [Whisk API] Extension not available, using browser automation');
          }
        }

        // Fallback to Playwright browser automation
        console.log('🌐 [Whisk API] Using Playwright browser automation...');
        const refresher = new WhiskTokenRefresher();
        const result = await refresher.refreshToken();
        return result.token;
      });

      // Update token store (both memory and .env)
      await WhiskTokenStore.setToken(token);

      // Update instance token
      this.bearerToken = token;

      console.log('✅ [Whisk API] Token refreshed successfully');

    } catch (error) {
      console.error('❌ [Whisk API] Token refresh failed:', error);
      throw new Error(`Automatic token refresh failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Converts reference images to Whisk API format
   */
  private async buildReferenceInputs(
    refs: WhiskReferenceImages
  ): Promise<any[]> {
    const referenceInputs = [];

    // Subject/Character reference
    if (refs.subject) {
      referenceInputs.push({
        imageId: `subject_${Date.now()}`,
        category: 'CHARACTER',
        imageData: await this.prepareImageData(refs.subject),
        isPlaceholder: false,
      });
    }

    // Scene/Location reference
    if (refs.scene) {
      referenceInputs.push({
        imageId: `scene_${Date.now() + 1}`,
        category: 'LOCATION',
        imageData: await this.prepareImageData(refs.scene),
        isPlaceholder: false,
      });
    }

    // Style reference
    if (refs.style) {
      referenceInputs.push({
        imageId: `style_${Date.now() + 2}`,
        category: 'STYLE',
        imageData: await this.prepareImageData(refs.style),
        isPlaceholder: false,
      });
    }

    return referenceInputs;
  }

  /**
   * Converts image (URL/path/base64) to base64 data URI
   */
  private async prepareImageData(imageInput: string): Promise<string> {
    // Already base64 data URI
    if (imageInput.startsWith('data:image/')) {
      return imageInput;
    }

    // HTTP(S) URL - download and convert
    if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
      const response = await axios.get(imageInput, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      const buffer = Buffer.from(response.data);
      return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    }

    // Local file path - read and convert
    const fs = require('fs/promises');
    const buffer = await fs.readFile(imageInput);

    // Detect MIME type from extension
    const ext = imageInput.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const mimeType = mimeMap[ext || 'jpg'] || 'image/jpeg';

    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }

  /**
   * Generate images using Whisk API (Enhanced with reference support & auto token refresh)
   *
   * @param request Image generation request
   * @param _retryCount Internal retry counter (prevents infinite loops)
   */
  async generateImage(
    request: WhiskImageGenerateRequest | WhiskGenerateRequest,
    _retryCount: number = 0
  ): Promise<WhiskGenerateResponse> {
    try {
      const typedRequest = request as WhiskImageGenerateRequest;
      console.log(`🎨 [Whisk API] Generating image: "${typedRequest.prompt}"`);

      const workflowId = `workflow_${Date.now()}`;
      const seed = typedRequest.seed || Math.floor(Math.random() * 1000000);

      // Build request body matching Whisk's actual format
      const requestBody: any = {
        clientContext: {
          workflowId,
          tool: 'BACKBONE',
          sessionId: `;${Date.now()}`,
        },
        imageModelSettings: {
          imageModel: typedRequest.imageModel || process.env.WHISK_IMAGE_MODEL || 'IMAGEN_3_5',
          aspectRatio: typedRequest.aspectRatio || 'IMAGE_ASPECT_RATIO_LANDSCAPE',
        },
        mediaCategory: 'MEDIA_CATEGORY_BOARD',
        prompt: typedRequest.prompt,
        seed,
      };

      // Add reference images if provided
      if (typedRequest.referenceImages) {
        console.log('🎨 [Whisk API] Adding reference images:', Object.keys(typedRequest.referenceImages));
        requestBody.referenceInputs = await this.buildReferenceInputs(
          typedRequest.referenceImages
        );
      }

      console.log('📤 [Whisk API] Request body:', JSON.stringify({
        ...requestBody,
        referenceInputs: requestBody.referenceInputs ? `${requestBody.referenceInputs.length} references` : undefined
      }, null, 2));

      const response = await axios.post(
        this.apiUrl,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json',
            'Referer': 'https://labs.google/',
          },
          timeout: 60000, // 60 second timeout
        }
      );

      console.log('✅ [Whisk API] Generation successful');

      // Parse Whisk API response format
      const imagePanels = response.data.imagePanels || [];
      const images: Array<{ url: string; base64: string; id: string }> = [];

      imagePanels.forEach((panel: any, panelIdx: number) => {
        const generatedImages = panel.generatedImages || [];
        generatedImages.forEach((img: any, imgIdx: number) => {
          images.push({
            url: img.imageUrl || null,
            base64: img.encodedImage || null,
            id: `image_${panelIdx}_${imgIdx}`,
          });
        });
      });

      console.log(`✅ [Whisk API] Received ${images.length} image(s)`);

      // Validate that we actually got images
      if (images.length === 0) {
        throw new Error('No images returned from API (empty response)');
      }

      return {
        images,
        workflowId,
        seed,
        status: 'success',
      };

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorData = error.response?.data;

        console.error('❌ [Whisk API] Request failed:', status, errorData);

        // Detect authentication failures (401 Unauthorized or 400 Bad Request with auth error)
        const isAuthError = status === 401 ||
                           (status === 400 && JSON.stringify(errorData).toLowerCase().includes('auth'));

        if (isAuthError && _retryCount === 0) {
          console.error(`⚠️  [Whisk API] Authentication failed (status: ${status})`);
          console.log('🔄 [Whisk API] Attempting automatic token refresh...');

          try {
            // Refresh token automatically
            await this.refreshTokenAndRetry();

            // Retry the same request with new token (increment retry count)
            console.log('🔁 [Whisk API] Retrying request with refreshed token...');
            return this.generateImage(request, _retryCount + 1);

          } catch (refreshError) {
            console.error('❌ [Whisk API] Token refresh failed:', refreshError);
            throw new Error(
              `Token refresh failed - already attempted once. ` +
              `Original error: ${status} - ${JSON.stringify(errorData)}`
            );
          }
        }

        // Non-auth error or retry already attempted
        throw new Error(`Whisk API error: ${status} - ${JSON.stringify(errorData)}`);
      }

      console.error('❌ [Whisk API] Unexpected error:', error);
      throw error;
    }
  }

  /**
   * Generate video using Whisk API (Phase 2 - Placeholder)
   */
  async generateVideo(
    request: WhiskVideoGenerateRequest
  ): Promise<WhiskGenerateResponse> {
    throw new Error('Video generation not yet implemented - requires API research');
  }

  /**
   * Download image from URL or decode base64
   */
  async downloadImage(imageUrl: string, base64Data?: string): Promise<Buffer> {
    try {
      // If we have base64 data, decode it directly
      if (base64Data) {
        console.log(`📥 [Whisk API] Decoding base64 image (${Math.round(base64Data.length / 1024)}KB)`);
        const buffer = Buffer.from(base64Data, 'base64');
        console.log('✅ [Whisk API] Decode complete');
        return buffer;
      }

      // Otherwise download from URL
      console.log(`📥 [Whisk API] Downloading image: ${imageUrl}`);

      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      console.log('✅ [Whisk API] Download complete');
      return Buffer.from(response.data);

    } catch (error) {
      console.error('❌ [Whisk API] Download failed:', error);
      throw new Error(`Failed to download image: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
