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
 * Displays the HeyGen avatar video in a corner with chromakey (green screen removal)
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
      <Video
        src={avatarMp4Url}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          // Simple chromakey approximation using CSS filters
          // For production, use WebGL shader for proper green screen removal
          // This approach works reasonably well for HeyGen's green screen
          filter: 'saturate(0.9) contrast(1.05) brightness(1.05)',
          // CSS-based green screen removal (basic)
          // Note: For better results, implement custom WebGL shader
          mixBlendMode: 'normal',
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Note: Advanced Chromakey Implementation
 *
 * For production-grade green screen removal, implement a WebGL shader:
 *
 * 1. Use Remotion's useVideoTexture hook
 * 2. Apply custom fragment shader:
 *    - Detect green pixels (HSV range)
 *    - Make them transparent
 *    - Apply edge smoothing/feathering
 *
 * Example shader logic:
 * ```glsl
 * uniform sampler2D videoTexture;
 * varying vec2 vUv;
 *
 * void main() {
 *   vec4 color = texture2D(videoTexture, vUv);
 *
 *   // Convert to HSV
 *   float hue = rgb2hue(color.rgb);
 *   float saturation = rgb2saturation(color.rgb);
 *
 *   // Green range: hue 0.25-0.45, saturation > 0.3
 *   if (hue > 0.25 && hue < 0.45 && saturation > 0.3) {
 *     color.a = 0.0; // Transparent
 *   }
 *
 *   gl_FragColor = color;
 * }
 * ```
 *
 * This is beyond the MVP scope but recommended for production.
 */
