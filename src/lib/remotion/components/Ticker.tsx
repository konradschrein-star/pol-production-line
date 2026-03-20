import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export interface TickerProps {
  headlines: string[];
  speed?: number; // Pixels per frame (default: 2)
  backgroundColor?: string;
  textColor?: string;
  separator?: string;
}

/**
 * Ticker Component
 * Scrolling news ticker at bottom of screen
 */
export const Ticker: React.FC<TickerProps> = ({
  headlines,
  speed = 2,
  backgroundColor = '#353535',
  textColor = '#FFFFFF',
  separator = ' • ',
}) => {
  const frame = useCurrentFrame();
  const { width, durationInFrames } = useVideoConfig();

  // Combine headlines into single string
  const tickerText = headlines.join(separator);

  // Estimate text width (rough approximation: 12px per character)
  const charWidth = 12;
  const textWidth = tickerText.length * charWidth;

  // Calculate scroll position
  // Start from right edge, scroll left, loop when fully scrolled
  const totalScrollDistance = width + textWidth;
  const scrollSpeed = speed; // Pixels per frame

  // Position cycles through: width → -textWidth → width (loop)
  const rawPosition = width - (frame * scrollSpeed);
  const scrollX = rawPosition % totalScrollDistance;

  // For seamless loop, we need two copies of the text
  const scrollX1 = scrollX;
  const scrollX2 = scrollX + textWidth + width;

  return (
    <AbsoluteFill
      style={{
        top: 'auto',
        height: '60px',
        backgroundColor,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        zIndex: 100,
      }}
    >
      {/* First copy */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          transform: `translateX(${scrollX1}px)`,
          fontSize: '16px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          whiteSpace: 'nowrap',
          color: textColor,
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
        }}
      >
        {tickerText}
      </div>

      {/* Second copy for seamless loop */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          transform: `translateX(${scrollX2}px)`,
          fontSize: '16px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          whiteSpace: 'nowrap',
          color: textColor,
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
        }}
      >
        {tickerText}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Alternative: Static Ticker (non-scrolling)
 * Useful for shorter headlines or different visual style
 */
export const StaticTicker: React.FC<{
  headline: string;
  backgroundColor?: string;
  textColor?: string;
}> = ({
  headline,
  backgroundColor = '#353535',
  textColor = '#FFFFFF',
}) => {
  return (
    <AbsoluteFill
      style={{
        top: 'auto',
        height: '60px',
        backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '0 40px',
      }}
    >
      <div
        style={{
          fontSize: '16px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          textAlign: 'center',
          color: textColor,
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%',
        }}
      >
        {headline}
      </div>
    </AbsoluteFill>
  );
};
