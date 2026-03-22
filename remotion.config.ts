/**
 * Remotion Configuration
 * https://www.remotion.dev/docs/config
 */

import { Config } from '@remotion/cli/config';

// Ensure public directory is properly served
Config.setPublicDir('./public');

// Set concurrency for faster rendering
Config.setConcurrency(8);

// Increase timeout for loading large assets
Config.setDelayRenderTimeoutInMilliseconds(120000); // 2 minutes

// Quality settings
Config.setVideoImageFormat('jpeg');
Config.setStillImageFormat('png');

// Codec settings for compatibility
Config.setCodec('h264');
Config.setCrf(18); // High quality (lower = better quality, 18 is visually lossless)

// Browser settings
Config.setBrowserExecutable(null); // Use bundled Chromium
Config.setChromiumOpenGlRenderer('angle'); // Better Windows compatibility
