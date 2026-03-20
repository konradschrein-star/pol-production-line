import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Img,
} from 'remotion';

export interface SceneProps {
  imageUrl: string;
  durationInFrames: number;
  enableKenBurns?: boolean;
}

/**
 * Scene Component
 * Displays a single image with optional Ken Burns effect (slow zoom + pan)
 */
export const Scene: React.FC<SceneProps> = ({
  imageUrl,
  durationInFrames,
  enableKenBurns = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate progress (0 to 1)
  const progress = Math.min(frame / durationInFrames, 1);

  // Ken Burns effect: Slow zoom in + subtle pan
  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  if (enableKenBurns) {
    // Zoom from 1.0 to 1.1 (10% zoom)
    scale = interpolate(
      progress,
      [0, 1],
      [1.0, 1.1],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    // Pan horizontally (alternate direction for variety)
    // Even scenes: pan right, odd scenes: pan left
    const panDirection = Math.floor(frame / durationInFrames) % 2 === 0 ? 1 : -1;
    translateX = interpolate(
      progress,
      [0, 1],
      [0, 30 * panDirection],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    // Subtle vertical pan
    translateY = interpolate(
      progress,
      [0, 1],
      [0, -15],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#131313', // Obsidian background
        overflow: 'hidden',
      }}
    >
      <Img
        src={imageUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          transition: 'transform 0.1s ease-out',
        }}
      />
    </AbsoluteFill>
  );
};
