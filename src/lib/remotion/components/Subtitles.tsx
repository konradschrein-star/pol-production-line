import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { WordTimestamp } from '../types';

export interface SubtitlesProps {
  wordTimestamps: WordTimestamp[];
  wordsPerLine?: number;
}

interface SubtitleChunk {
  text: string;
  startTime: number;
  endTime: number;
  startIndex: number;
}

/**
 * Subtitles Component
 *
 * Displays synchronized subtitles based on word-level timestamps.
 * Production-grade implementation with:
 * - Efficient memoized chunk calculation
 * - Smooth fade in/out transitions
 * - Proper positioning above ticker and avatar
 * - Clean, readable typography
 */
export const Subtitles: React.FC<SubtitlesProps> = ({
  wordTimestamps,
  wordsPerLine = 6
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  // Memoize subtitle chunks to avoid recalculating every frame
  const subtitleChunks = useMemo<SubtitleChunk[]>(() => {
    if (!wordTimestamps || wordTimestamps.length === 0) {
      return [];
    }

    const chunks: SubtitleChunk[] = [];

    for (let i = 0; i < wordTimestamps.length; i += wordsPerLine) {
      const chunkWords = wordTimestamps.slice(i, i + wordsPerLine);

      if (chunkWords.length === 0) continue;

      const firstWord = chunkWords[0];
      const lastWord = chunkWords[chunkWords.length - 1];

      chunks.push({
        text: chunkWords.map(w => w.word).join(' '),
        startTime: firstWord.start,
        endTime: lastWord.end,
        startIndex: i,
      });
    }

    return chunks;
  }, [wordTimestamps, wordsPerLine]);

  // Find active subtitle chunk
  const activeChunk = subtitleChunks.find(
    chunk => currentTime >= chunk.startTime && currentTime <= chunk.endTime
  );

  if (!activeChunk) {
    return null;
  }

  // Smooth fade in/out animation
  const FADE_DURATION = 0.2; // 200ms fade
  const fadeIn = interpolate(
    currentTime,
    [activeChunk.startTime, activeChunk.startTime + FADE_DURATION],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const fadeOut = interpolate(
    currentTime,
    [activeChunk.endTime - FADE_DURATION, activeChunk.endTime],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 140, // Position above ticker (60px) + avatar overlap buffer
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: '14px 28px',
          borderRadius: '8px',
          maxWidth: '85%',
          opacity,
          transform: `translateY(${(1 - opacity) * 10}px)`, // Subtle vertical slide
        }}
      >
        <p
          style={{
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: 34,
            fontWeight: 600,
            color: '#FFFFFF',
            margin: 0,
            textAlign: 'center',
            lineHeight: 1.5,
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
            letterSpacing: '0.01em',
          }}
        >
          {activeChunk.text}
        </p>
      </div>
    </AbsoluteFill>
  );
};
