/**
 * Remotion Entry Point
 * Register compositions here
 */

import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { NewsVideo } from './compositions/NewsVideo';

// Export components for use in render worker
export { NewsVideo } from './compositions/NewsVideo';
export { Scene } from './components/Scene';
export { AvatarOverlay } from './components/AvatarOverlay';
export { Subtitles } from './components/Subtitles';
export { Ticker } from './components/Ticker';
export { calculateScenePacing } from './pacing';

// Remotion Root - Register NewsVideo composition
export const RemotionRoot: React.FC = () => {
  return React.createElement(
    Composition,
    {
      id: 'NewsVideo',
      component: NewsVideo,
      durationInFrames: 2970, // 99s @ 30fps
      fps: 30,
      width: 1920,
      height: 1080,
      defaultProps: {
        avatarMp4Url: '',
        avatarDurationSeconds: 99,
        avatarAspectRatio: 0.5625, // 9:16 (default)
        avatarWidth: 1080,
        avatarHeight: 1920,
        scenes: [],
        wordTimestamps: undefined, // Optional: word-level timestamps for advanced pacing
      },
    },
    null
  );
};

// Register for Remotion CLI
registerRoot(RemotionRoot);
