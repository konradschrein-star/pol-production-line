import React, { useState } from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
} from 'remotion';
import {
  selectPatternForScene,
  easingFunctions,
  getAnimationProfile,
  isAnimationEnabled,
} from '../animations';

/**
 * Convert absolute path to relative path for staticFile()
 * Examples:
 *  - "C:\\...\\public\\images\\file.jpg" -> "images/file.jpg"
 *  - "public/images/file.jpg" -> "images/file.jpg"
 *  - "images/file.jpg" -> "images/file.jpg"
 */
function toStaticFilePath(filePath: string): string {
  // Normalize separators to forward slashes
  const normalized = filePath.replace(/\\/g, '/');

  // Extract everything after 'public/' (greedy match to get last occurrence)
  const publicIndex = normalized.lastIndexOf('public/');
  if (publicIndex !== -1) {
    const afterPublic = normalized.substring(publicIndex + 7); // 7 = length of 'public/'
    return afterPublic; // Should be "images/file.jpg"
  }

  // If already relative (no drive letter, doesn't start with /)
  if (!normalized.match(/^[a-zA-Z]:/) && !normalized.startsWith('/')) {
    // Strip 'public/' prefix if present
    return normalized.replace(/^public\//, '');
  }

  // Fallback: extract filename and assume it's in images/
  const parts = normalized.split('/');
  const filename = parts[parts.length - 1];
  return `images/${filename}`;
}

export interface SceneProps {
  imageUrl: string;
  durationInFrames: number;
  enableKenBurns?: boolean;
  sceneIndex?: number; // For pattern selection
  totalScenes?: number; // For pattern selection
}

/**
 * Scene Component
 * Displays a single image with optional Ken Burns effect (slow zoom + pan)
 * Now with dynamic animation pattern selection for variety
 */
export const Scene: React.FC<SceneProps> = ({
  imageUrl,
  durationInFrames,
  enableKenBurns = true,
  sceneIndex = 0,
  totalScenes = 8,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Error state for image loading failures
  const [imageError, setImageError] = useState(false);

  // Get animation profile and pattern
  const animationProfile = getAnimationProfile();
  const animationEnabled = isAnimationEnabled() && enableKenBurns;

  // Ken Burns effect: CONSTANT TIME-BASED ZOOM RATE (not progress-based)
  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  if (animationEnabled) {
    // CONSTANT ZOOM RATE: Always start at 100%, zoom at constant speed
    // This ensures short scenes and long scenes zoom at the same rate

    const currentTimeSeconds = frame / fps;

    // Two-phase zoom rate:
    // - Phase 1 (0-30s): 0.003 per second (0.3% per second = 9% zoom in 30s)
    // - Phase 2 (30s+): 0.001 per second (0.1% per second = slower for long scenes)

    const ZOOM_RATE_FAST = 0.003; // First 30 seconds
    const ZOOM_RATE_SLOW = 0.001; // After 30 seconds
    const TRANSITION_TIME = 30; // Transition at 30 seconds

    let zoomAmount = 0;

    if (currentTimeSeconds <= TRANSITION_TIME) {
      // Phase 1: Fast zoom for first 30 seconds
      zoomAmount = currentTimeSeconds * ZOOM_RATE_FAST;
    } else {
      // Phase 2: Slower zoom after 30 seconds
      const phase1Zoom = TRANSITION_TIME * ZOOM_RATE_FAST; // 0.09 (9%)
      const phase2Time = currentTimeSeconds - TRANSITION_TIME;
      const phase2Zoom = phase2Time * ZOOM_RATE_SLOW;
      zoomAmount = phase1Zoom + phase2Zoom;
    }

    // Always start at 1.0 (100%), never go below
    scale = Math.max(1.0, 1.0 + zoomAmount);

    // Minimal pan for stability (no complex patterns)
    // Very slight upward drift to add subtle life
    translateX = 0;
    translateY = interpolate(
      frame,
      [0, durationInFrames],
      [0, -10], // Slight upward drift (10px over duration)
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );
  }

  // Handle different image URL formats with enhanced error handling
  let imageSrc: string = '';
  let resolvedPath: string = imageUrl;

  try {
    if (imageUrl.startsWith('data:') || imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // Data URLs or HTTP URLs: use directly
      imageSrc = imageUrl;
    } else if (imageUrl.startsWith('file://')) {
      // File URLs: use directly
      imageSrc = imageUrl;
    } else {
      // Local file path: use staticFile() for Remotion
      // Files are copied to public/images/ before render
      const relativePath = toStaticFilePath(imageUrl); // e.g., "images/abc123.jpg"
      imageSrc = staticFile(relativePath);
      resolvedPath = `public/${relativePath}`;
    }

    if (!imageSrc) {
      throw new Error('Image path resolution returned empty result');
    }

  } catch (error) {
    console.error(`❌ [Scene ${sceneIndex + 1}] Path resolution failed for: ${imageUrl}`);
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    setImageError(true);
    imageSrc = ''; // Will trigger onError handler
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#131313',
        overflow: 'hidden',
      }}
    >
      {/* Professional gradient background */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, #2a2a2a 0%, #131313 70%)',
          opacity: 0.6,
        }}
      />

      {/* Main image with Ken Burns effect */}
      <AbsoluteFill
        style={{
          transform: enableKenBurns
            ? `scale(${scale}) translate(${translateX}px, ${translateY}px)`
            : undefined,
        }}
      >
        {!imageError ? (
          <Img
            src={imageSrc}
            onError={(e) => {
              console.error(`❌ [Scene ${sceneIndex + 1}] Image failed to load`);
              console.error(`   Original URL: ${imageUrl}`);
              console.error(`   Resolved path: ${resolvedPath}`);
              console.error(`   Image src: ${imageSrc}`);
              setImageError(true);
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover', // Fill entire frame, crop if needed to avoid black bars
            }}
          />
        ) : (
          // Fallback UI when image fails to load
          <AbsoluteFill
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1a1a1a',
              padding: '40px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '120px',
                marginBottom: '20px',
                opacity: 0.5,
              }}
            >
              ⚠️
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#ff6b6b',
                marginBottom: '10px',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Image Load Failed
            </div>
            <div
              style={{
                fontSize: '18px',
                color: '#999',
                fontFamily: 'Roboto Mono, monospace',
                maxWidth: '80%',
                wordBreak: 'break-all',
              }}
            >
              Scene {sceneIndex + 1} / {totalScenes}
            </div>
            <div
              style={{
                fontSize: '14px',
                color: '#666',
                marginTop: '20px',
                fontFamily: 'Roboto Mono, monospace',
                maxWidth: '80%',
                wordBreak: 'break-all',
              }}
            >
              {imageUrl}
            </div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
