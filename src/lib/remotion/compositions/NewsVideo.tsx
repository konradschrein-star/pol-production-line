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

  console.log(`\n🎬 [NewsVideo] Scene sorting and mapping:`);
  console.log(`   Input scenes: ${scenes.length}`);
  console.log(`   Pacing timings: ${pacing.sceneTiming.length}`);

  // CRITICAL VALIDATION: Ensure scene count matches timing count
  if (scenes.length !== pacing.sceneTiming.length) {
    console.error(`❌ [NewsVideo] SCENE/TIMING COUNT MISMATCH!`);
    console.error(`   Database scenes: ${scenes.length}`);
    console.error(`   Pacing timings: ${pacing.sceneTiming.length}`);
    console.error(`   This will cause incorrect scene-to-timing mapping!`);
  }

  // Map scenes to timing with detailed logging
  const scenesWithTiming = sortedScenes.map((scene, index) => {
    const timing = pacing.sceneTiming[index];

    console.log(`   [MAPPING] Scene ${index} (scene_order=${scene.scene_order}):`);
    console.log(`      Timing: Frame ${timing?.startFrame} - ${timing ? timing.startFrame + timing.durationInFrames - 1 : 'N/A'} (${timing?.durationInFrames || 0} frames)`);
    console.log(`      Image: ${scene.image_url}`);

    if (!timing) {
      console.error(`      ❌ NO TIMING FOUND FOR SCENE ${index}!`);
    }

    return {
      ...scene,
      timing: timing,
    };
  });

  // Extract headlines for ticker
  const headlines = sortedScenes.map(s => s.ticker_headline);

  console.log(`\n🎬 [NewsVideo] Rendering composition:`);
  console.log(`   Total duration: ${avatarDurationSeconds}s (${pacing.totalDurationInFrames} frames)`);
  console.log(`   Avatar aspect ratio: ${avatarAspectRatio?.toFixed(4) || 'not provided'} (${avatarWidth}x${avatarHeight})`);
  console.log(`   Scenes: ${scenes.length}`);
  console.log(`   Scenes with timing: ${scenesWithTiming.length}`);
  console.log(`   Hook scenes: ${pacing.hookScenes} @ 1.5s`);
  console.log(`   Body scenes: ${pacing.bodyScenes}`);

  console.log(`\n🎥 [NewsVideo] Creating Sequences:`);
  scenesWithTiming.forEach((scene, index) => {
    if (scene.timing) {
      console.log(`   Sequence ${index}: scene_order=${scene.scene_order}, from=${scene.timing.startFrame}, duration=${scene.timing.durationInFrames}, image=${scene.image_url}`);
    } else {
      console.error(`   ❌ Sequence ${index}: NO TIMING (will fail to render)`);
    }
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#131313' }}>
      {/* Background Scenes with Ken Burns effect */}
      {scenesWithTiming.map((scene, index) => {
        if (!scene.timing) {
          console.error(`❌ [NewsVideo] Skipping scene ${index} - no timing data`);
          return null;
        }

        return (
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
              sceneIndex={index}
              totalScenes={scenes.length}
            />
          </Sequence>
        );
      })}

      {/* Avatar Overlay (start from frame 1 to avoid first-frame loading issue) */}
      <Sequence from={1}>
        <AvatarOverlay
          avatarMp4Url={avatarMp4Url}
          avatarAspectRatio={avatarAspectRatio}
          position="bottom-right"
        />
      </Sequence>

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
