import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  OffthreadVideo,
  staticFile,
  useVideoConfig,
  useCurrentFrame,
  interpolate,
} from 'remotion';

/**
 * Convert absolute path to relative path for staticFile()
 * Examples:
 *  - "C:\\...\\public\\avatars\\file.mp4" -> "avatars/file.mp4"
 *  - "C:\\...\\avatars\\file.mp4" -> "avatars/file.mp4"
 *  - "public/avatars/file.mp4" -> "avatars/file.mp4"
 *  - "avatars/file.mp4" -> "avatars/file.mp4"
 */
function toStaticFilePath(filePath: string): string {
  // Normalize separators to forward slashes
  const normalized = filePath.replace(/\\/g, '/');

  // Extract filename from path
  const filename = normalized.split('/').pop() || filePath;

  // Always return avatars/filename for avatar files
  // This ensures Remotion loads from /avatars/ (served from public folder)
  return `avatars/${filename}`;
}

export interface AvatarOverlayProps {
  avatarMp4Url: string;
  avatarAspectRatio?: number; // width/height (e.g., 0.5625 for 9:16, 1.0 for 1:1, 1.777 for 16:9)
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  heightPercent?: number; // Height as percentage of composition (default: 40%)
  enablePositionVariation?: boolean; // Enable subtle position oscillation (default: true)
}

/**
 * Avatar Overlay Component
 *
 * Displays the avatar video with proper aspect ratio preservation.
 * The container dimensions are calculated to match the source video's aspect ratio.
 *
 * Supported aspect ratios:
 * - 16:9 (horizontal: 1.777)
 * - 9:16 (vertical: 0.5625)
 * - 1:1 (square: 1.0)
 * - 4:3 (standard: 1.333)
 * - Any custom ratio
 */
export const AvatarOverlay: React.FC<AvatarOverlayProps> = ({
  avatarMp4Url,
  avatarAspectRatio,
  position = 'bottom-right',
  heightPercent = 50, // Increased from 40% for better visibility
  enablePositionVariation = false, // DISABLED: Keep avatar static, no movement
}) => {
  const { width: compositionWidth, height: compositionHeight } = useVideoConfig();
  const frame = useCurrentFrame();

  // Calculate container size to match avatar aspect ratio
  const containerSize = useMemo(() => {
    // Default to 9:16 if not provided (for backwards compatibility)
    const aspectRatio = avatarAspectRatio ?? 0.5625;

    // Calculate height in pixels
    const heightPx = compositionHeight * (heightPercent / 100);

    // Calculate width to maintain aspect ratio
    const widthPx = heightPx * aspectRatio;

    // Convert to percentages
    const widthPercent = (widthPx / compositionWidth) * 100;

    console.log(`📐 [AvatarOverlay] Container dimensions:`);
    console.log(`   Composition: ${compositionWidth}x${compositionHeight}`);
    console.log(`   Avatar aspect ratio: ${aspectRatio.toFixed(4)}`);
    console.log(`   Container: ${widthPx.toFixed(0)}x${heightPx.toFixed(0)}px (${widthPercent.toFixed(2)}% x ${heightPercent}%)`);

    return {
      width: `${widthPercent}%`,
      height: `${heightPercent}%`,
    };
  }, [avatarAspectRatio, compositionWidth, compositionHeight, heightPercent]);
  // Calculate subtle position oscillation
  // Uses slow sine wave for natural breathing motion
  const positionOffset = useMemo(() => {
    if (!enablePositionVariation) {
      return { x: 0, y: 0 };
    }

    // Slow oscillation (period: ~300 frames = 10 seconds at 30fps)
    const period = 300;
    const progress = (frame % period) / period;
    const angle = progress * Math.PI * 2;

    // Small amplitude for subtle effect
    const xOffset = Math.sin(angle) * 8; // ±8px horizontal
    const yOffset = Math.sin(angle * 1.3) * 6; // ±6px vertical (different frequency for variety)

    return { x: xOffset, y: yOffset };
  }, [frame, enablePositionVariation]);

  // Position styles with variation
  const basePositions: Record<string, { bottom?: number; top?: number; left?: number; right?: number }> = {
    'bottom-right': {
      bottom: 100, // Above ticker (adjusted for larger avatar size)
      right: 40,
    },
    'bottom-left': {
      bottom: 80,
      left: 40,
    },
    'top-right': {
      top: 40,
      right: 40,
    },
    'top-left': {
      top: 40,
      left: 40,
    },
  };

  const basePosition = basePositions[position];
  const positionStyles: React.CSSProperties = {
    bottom: basePosition.bottom !== undefined ? basePosition.bottom - positionOffset.y : undefined,
    top: basePosition.top !== undefined ? basePosition.top + positionOffset.y : undefined,
    left: basePosition.left !== undefined ? basePosition.left + positionOffset.x : undefined,
    right: basePosition.right !== undefined ? basePosition.right - positionOffset.x : undefined,
  };

  return (
    <AbsoluteFill
      style={{
        ...positionStyles,
        top: positionStyles.top !== undefined ? positionStyles.top : 'auto',
        left: positionStyles.left !== undefined ? positionStyles.left : 'auto',
        width: containerSize.width,
        height: containerSize.height,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: '#1a1a1a',
        }}
      >
        <OffthreadVideo
          src={
            avatarMp4Url.startsWith('http') || avatarMp4Url.startsWith('data:') || avatarMp4Url.startsWith('file://')
              ? avatarMp4Url
              : staticFile(toStaticFilePath(avatarMp4Url))
          }
          startFrom={0}
          pauseWhenBuffering={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover', // Fill container completely while maintaining aspect ratio
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

