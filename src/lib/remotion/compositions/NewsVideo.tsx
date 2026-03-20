import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useVideoConfig,
} from 'remotion';
import { Scene } from '../components/Scene';
import { AvatarOverlay } from '../components/AvatarOverlay';
import { Ticker } from '../components/Ticker';
import { calculateScenePacing, SceneTiming } from '../pacing';

export interface NewsVideoProps {
  avatarMp4Url: string;
  avatarDurationSeconds: number;
  scenes: Array<{
    id: string;
    image_url: string;
    ticker_headline: string;
    scene_order: number;
  }>;
}

/**
 * Main News Video Composition
 * Combines scenes, avatar overlay, and ticker into final video
 */
export const NewsVideo: React.FC<NewsVideoProps> = ({
  avatarMp4Url,
  avatarDurationSeconds,
  scenes,
}) => {
  const { fps } = useVideoConfig();

  // Calculate scene pacing
  const pacing = calculateScenePacing(avatarDurationSeconds, scenes.length, fps);

  // Sort scenes by order
  const sortedScenes = [...scenes].sort((a, b) => a.scene_order - b.scene_order);

  // Map scenes to timing
  const scenesWithTiming = sortedScenes.map((scene, index) => ({
    ...scene,
    timing: pacing.sceneTiming[index],
  }));

  // Extract headlines for ticker
  const headlines = sortedScenes.map(s => s.ticker_headline);

  console.log(`\n🎬 [NewsVideo] Rendering composition:`);
  console.log(`   Total duration: ${avatarDurationSeconds}s (${pacing.totalDurationInFrames} frames)`);
  console.log(`   Scenes: ${scenes.length}`);
  console.log(`   Hook scenes: ${pacing.hookScenes} @ 1.5s`);
  console.log(`   Body scenes: ${pacing.bodyScenes}`);

  return (
    <AbsoluteFill style={{ backgroundColor: '#131313' }}>
      {/* Background Scenes with Ken Burns effect */}
      {scenesWithTiming.map((scene) => (
        <Sequence
          key={scene.id}
          from={scene.timing.startFrame}
          durationInFrames={scene.timing.durationInFrames}
          name={`Scene ${scene.scene_order}`}
        >
          <Scene
            imageUrl={scene.image_url}
            durationInFrames={scene.timing.durationInFrames}
            enableKenBurns={true}
          />
        </Sequence>
      ))}

      {/* Avatar Overlay (full duration) */}
      <AvatarOverlay
        avatarMp4Url={avatarMp4Url}
        position="bottom-right"
        size={{ width: '25%', height: '35%' }}
      />

      {/* Scrolling Ticker (full duration) */}
      <Ticker
        headlines={headlines}
        speed={2}
        backgroundColor="#353535"
        textColor="#FFFFFF"
        separator=" • "
      />
    </AbsoluteFill>
  );
};
