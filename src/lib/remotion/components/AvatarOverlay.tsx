import React from 'react';
import {
  AbsoluteFill,
  Video,
} from 'remotion';

export interface AvatarOverlayProps {
  avatarMp4Url: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: {
    width: string;
    height: string;
  };
}

/**
 * Avatar Overlay Component
 * Displays the HeyGen avatar video in a rounded corner box with drop shadow
 */
export const AvatarOverlay: React.FC<AvatarOverlayProps> = ({
  avatarMp4Url,
  position = 'bottom-right',
  size = {
    width: '25%',
    height: '35%',
  },
}) => {
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
        width: size.width,
        height: size.height,
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
          src={avatarMp4Url}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

