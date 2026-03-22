import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useVideoConfig,
} from 'remotion';
import { Scene } from '../components/Scene';
import { AvatarOverlay } from '../components/AvatarOverlay';
import { Subtitles } from '../components/Subtitles';
import { NewsTickerOverlay } from '../components/NewsTickerOverlay';
import { calculateScenePacing, calculateTranscriptBasedPacing, SceneTiming } from '../pacing';
import { WordTimestamp } from '../types';

export interface NewsVideoProps {
  avatarMp4Url: string;
  avatarDurationSeconds: number;
  avatarAspectRatio?: number; // width/height (e.g., 0.5625 for 9:16)
  avatarWidth?: number;
  avatarHeight?: number;
  scenes: Array<{
    id: string;
    image_url: string;
    ticker_headline: string;
    scene_order: number;
  }>;
  wordTimestamps?: WordTimestamp[];
}

/**
 * Main News Video Composition
 * Combines scenes, avatar overlay, and ticker into final video
 */
export const NewsVideo: React.FC<NewsVideoProps> = ({
  avatarMp4Url,
  avatarDurationSeconds,
  avatarAspectRatio,
  avatarWidth,
  avatarHeight,
  scenes,
  wordTimestamps,
}) => {
  const { fps } = useVideoConfig();

  // Calculate scene pacing (transcript-based if available, time-based fallback)
  const pacing = wordTimestamps && wordTimestamps.length > 0
    ? calculateTranscriptBasedPacing({
        avatarDurationSeconds,
        wordTimestamps,
        sceneCount: scenes.length,
        fps,
      })
    : calculateScenePacing(avatarDurationSeconds, scenes.length, fps);

  console.log(`   Pacing mode: ${wordTimestamps ? 'TRANSCRIPT-BASED' : 'TIME-BASED (fallback)'}`);

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
  console.log(`   Avatar aspect ratio: ${avatarAspectRatio?.toFixed(4) || 'not provided'} (${avatarWidth}x${avatarHeight})`);
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
        avatarAspectRatio={avatarAspectRatio}
        position="bottom-right"
      />

      {/* Subtitles (only if word timestamps available) */}
      {wordTimestamps && wordTimestamps.length > 0 && (
        <Subtitles wordTimestamps={wordTimestamps} wordsPerLine={6} />
      )}

      {/* Professional News Ticker Overlay (full duration) */}
      <NewsTickerOverlay
        headlines={headlines}
        channelName="OBSIDIAN NEWS"
        speed={3}
        accentColor="#E63946"
      />
    </AbsoluteFill>
  );
};
