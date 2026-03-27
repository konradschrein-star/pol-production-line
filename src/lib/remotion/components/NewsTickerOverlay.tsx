import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { tickerAnimationConfig } from '../animations/config';

export interface NewsTickerOverlayProps {
  headlines: string[];
  channelName?: string;
  speed?: number; // Pixels per frame (default: 3)
  accentColor?: string;
}

/**
 * Professional News Ticker Overlay
 * Styled like CNN/Fox News with branding and scrolling text
 */
export const NewsTickerOverlay: React.FC<NewsTickerOverlayProps> = ({
  headlines,
  channelName = 'OBSIDIAN NEWS',
  speed = 3,
  accentColor = '#E63946', // Red accent
}) => {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();

  // Combine headlines into single string with separator
  const tickerText = headlines.join('  •  ').toUpperCase();

  // Calculate variable speed based on combined headline length
  const baseSpeed = speed || tickerAnimationConfig.baseSpeed;
  const longHeadlineSpeed = tickerAnimationConfig.longHeadlineSpeed;
  const threshold = tickerAnimationConfig.longHeadlineThreshold;

  // Use slower speed for long headlines to improve readability
  const scrollSpeed = tickerText.length > threshold ? longHeadlineSpeed : baseSpeed;

  // Calculate scroll position for seamless loop
  const charWidth = 14; // Pixels per character (approximate)
  const textWidth = tickerText.length * charWidth;

  // Continuous scroll from right to left
  const scrollX = width - (frame * scrollSpeed);

  return (
    <AbsoluteFill
      style={{
        bottom: 0,
        top: 'auto',
        height: '70px',
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: 'transparent',
        zIndex: 100,
      }}
    >
      {/* Main ticker bar */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(10, 10, 10, 0.98)',
          position: 'relative',
          overflow: 'hidden',
          borderTop: `3px solid ${accentColor}`,
        }}
      >
        {/* Channel branding box */}
        <div
          style={{
            paddingLeft: '24px',
            paddingRight: '24px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: accentColor,
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontFamily: 'Inter, Arial, sans-serif',
              fontSize: '18px',
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {channelName}
          </span>
        </div>

        {/* Scrolling ticker text container */}
        <div
          style={{
            flex: 1,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            position: 'relative',
            paddingLeft: '24px',
          }}
        >
          {/* Continuously scrolling text */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              display: 'flex',
              alignItems: 'center',
              height: '100%',
            }}
          >
            {/* Render multiple copies for seamless loop */}
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                style={{
                  transform: `translateX(${scrollX + index * (textWidth + 100)}px)`,
                  fontSize: '20px',
                  fontFamily: 'Inter, Arial, sans-serif',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.03em',
                  paddingRight: '100px',
                }}
              >
                {tickerText}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Alternative: Breaking News Alert Ticker
 * More prominent "BREAKING NEWS" style
 */
export const BreakingNewsTickerOverlay: React.FC<NewsTickerOverlayProps> = ({
  headlines,
  speed = 3,
  accentColor = '#C1121F', // Darker red for breaking news
}) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  const tickerText = headlines.join('  •  ').toUpperCase();
  const charWidth = 14;
  const textWidth = tickerText.length * charWidth;
  const totalScrollDistance = width + textWidth;
  const scrollSpeed = speed;
  const rawPosition = width - (frame * scrollSpeed);
  const scrollX = rawPosition % totalScrollDistance;

  return (
    <AbsoluteFill
      style={{
        top: 'auto',
        height: '90px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'transparent',
        zIndex: 100,
      }}
    >
      {/* Breaking news banner */}
      <div
        style={{
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: accentColor,
          paddingLeft: '20px',
          paddingRight: '20px',
          boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.5)',
        }}
      >
        <span
          style={{
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: '20px',
            fontWeight: 900,
            color: '#FFFFFF',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.6)',
          }}
        >
          ⚡ BREAKING NEWS
        </span>
      </div>

      {/* Ticker text */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(20, 20, 20, 0.95)',
          backdropFilter: 'blur(10px)',
          overflow: 'hidden',
          position: 'relative',
          paddingLeft: '20px',
          paddingRight: '20px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            transform: `translateX(${scrollX}px)`,
            fontSize: '18px',
            fontFamily: 'Inter, Arial, sans-serif',
            fontWeight: 700,
            color: '#FFFFFF',
            whiteSpace: 'nowrap',
            textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)',
          }}
        >
          {tickerText}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            transform: `translateX(${scrollX + textWidth + width}px)`,
            fontSize: '18px',
            fontFamily: 'Inter, Arial, sans-serif',
            fontWeight: 700,
            color: '#FFFFFF',
            whiteSpace: 'nowrap',
            textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)',
          }}
        >
          {tickerText}
        </div>
      </div>
    </AbsoluteFill>
  );
};
