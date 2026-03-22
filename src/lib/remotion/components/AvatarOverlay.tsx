import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Video,
  staticFile,
  useVideoConfig,
} from 'remotion';

export interface AvatarOverlayProps {
  avatarMp4Url: string;
  avatarAspectRatio?: number; // width/height (e.g., 0.5625 for 9:16, 1.0 for 1:1, 1.777 for 16:9)
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  heightPercent?: number; // Height as percentage of composition (default: 40%)
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
  heightPercent = 40,
}) => {
  const { width: compositionWidth, height: compositionHeight } = useVideoConfig();

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
  // Position styles
  const positionStyles: Record<string, React.CSSProperties> = {
    'bottom-right': {
      bottom: 80, // Above ticker
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

  return (
    <AbsoluteFill
      style={{
        ...positionStyles[position],
        top: 'auto',
        left: 'auto',
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
        <Video
          src={avatarMp4Url.startsWith('/') ? staticFile(avatarMp4Url) : avatarMp4Url}
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

