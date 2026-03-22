import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

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
  const { width } = useVideoConfig();

  // Combine headlines into single string with separator
  const tickerText = headlines.join('  •  ').toUpperCase();

  // Calculate scroll position
  const charWidth = 14; // Pixels per character (approximate)
  const textWidth = tickerText.length * charWidth;
  const totalScrollDistance = width + textWidth;
  const scrollSpeed = speed;

  // Position cycles for seamless loop
  const rawPosition = width - (frame * scrollSpeed);
  const scrollX = rawPosition % totalScrollDistance;

  return (
    <AbsoluteFill
      style={{
        top: 'auto',
        height: '80px',
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
          backgroundColor: 'rgba(20, 20, 20, 0.95)', // Semi-transparent dark background
          backdropFilter: 'blur(10px)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Red accent bar on left */}
        <div
          style={{
            width: '6px',
            height: '100%',
            backgroundColor: accentColor,
            position: 'absolute',
            left: 0,
            top: 0,
          }}
        />

        {/* Channel branding box */}
        <div
          style={{
            marginLeft: '16px',
            paddingLeft: '20px',
            paddingRight: '20px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: accentColor,
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
          }}
        >
          <span
            style={{
              fontFamily: 'Inter, Arial, sans-serif',
              fontSize: '16px',
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {channelName}
          </span>
        </div>

        {/* Scrolling ticker text */}
        <div
          style={{
            marginLeft: '20px',
            flex: 1,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* First copy */}
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
              letterSpacing: '0.02em',
            }}
          >
            {tickerText}
          </div>

          {/* Second copy for seamless loop */}
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
              letterSpacing: '0.02em',
            }}
          >
            {tickerText}
          </div>
        </div>

        {/* Gradient fade on right edge */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '100px',
            height: '100%',
            background: 'linear-gradient(to right, transparent, rgba(20, 20, 20, 0.95))',
            pointerEvents: 'none',
          }}
        />
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
