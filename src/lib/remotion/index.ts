/**
 * Remotion Entry Point
 * Register compositions here
 */

import { registerRoot } from 'remotion';
import { NewsVideo } from './compositions/NewsVideo';

// Export components for use in render worker
export { NewsVideo } from './compositions/NewsVideo';
export { Scene } from './components/Scene';
export { AvatarOverlay } from './components/AvatarOverlay';
export { Ticker } from './components/Ticker';
export { calculateScenePacing, getVideoDuration } from './pacing';

// For Remotion Studio preview (if needed later)
export const RemotionRoot: React.FC = () => {
  return null; // Compositions registered dynamically in render worker
};

// Register for Remotion CLI
registerRoot(RemotionRoot);
