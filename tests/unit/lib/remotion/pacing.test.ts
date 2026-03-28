/**
 * Pacing Algorithm Test Suite
 *
 * Tests the critical frame-perfect pacing logic for video composition.
 * Errors here cause black screens and timing issues in final videos.
 *
 * Priority: MOST CRITICAL
 * Coverage Target: 95%+
 */

import { describe, it, expect } from 'vitest';
import {
  calculateScenePacing,
  calculateTranscriptBasedPacing,
  PacingResult,
  SceneTiming,
} from '@/lib/remotion/pacing';
import { WordTimestamp } from '@/lib/remotion/types';

describe('Pacing Algorithm', () => {
  describe('calculateScenePacing (Time-Based)', () => {
    describe('Standard Videos (>30s)', () => {
      it('should calculate hook and body phases for 60s video with 12 scenes', () => {
        const result = calculateScenePacing(60, 12, 30);

        expect(result.totalDurationInSeconds).toBe(60);
        expect(result.totalDurationInFrames).toBe(1800); // 60s * 30fps
        expect(result.sceneTiming.length).toBe(12);

        // Verify hook phase (0-30s)
        expect(result.hookScenes).toBeGreaterThan(0);
        expect(result.bodyScenes).toBeGreaterThan(0);

        // Verify all scenes have valid timing
        result.sceneTiming.forEach((scene, idx) => {
          expect(scene.sceneId).toBe(`scene_${idx}`);
          expect(scene.startFrame).toBeGreaterThanOrEqual(0);
          expect(scene.durationInFrames).toBeGreaterThan(0);
          expect(scene.durationInSeconds).toBeGreaterThan(0);
        });

        // Verify continuous coverage (no gaps)
        verifyContinuousCoverage(result.sceneTiming, result.totalDurationInFrames);
      });

      it('should use 1.5s intervals for hook scenes', () => {
        const result = calculateScenePacing(60, 12, 30);

        // Hook scenes should use 1.5s intervals
        const hookScenes = result.sceneTiming.slice(0, result.hookScenes);
        hookScenes.forEach((scene) => {
          expect(scene.durationInSeconds).toBeCloseTo(1.5, 1);
        });
      });

      it('should distribute body scenes evenly', () => {
        const result = calculateScenePacing(120, 20, 30);

        const bodyScenes = result.sceneTiming.slice(result.hookScenes);

        // Body scenes (excluding last adjusted scene) should have similar duration
        const durationsExceptLast = bodyScenes.slice(0, -1).map((s) => s.durationInSeconds);

        if (durationsExceptLast.length > 1) {
          const avgDuration = durationsExceptLast.reduce((a, b) => a + b, 0) / durationsExceptLast.length;

          durationsExceptLast.forEach((duration) => {
            // Allow up to 10% variance (excluding last adjusted scene)
            expect(Math.abs(duration - avgDuration) / avgDuration).toBeLessThan(0.1);
          });
        }

        // Last scene may vary more due to frame-perfect adjustment
        expect(bodyScenes[bodyScenes.length - 1].durationInSeconds).toBeGreaterThan(0);
      });

      it('should handle long videos (120s, 20 scenes)', () => {
        const result = calculateScenePacing(120, 20, 30);

        expect(result.totalDurationInSeconds).toBe(120);
        expect(result.totalDurationInFrames).toBe(3600); // 120s * 30fps
        expect(result.sceneTiming.length).toBe(20);

        verifyContinuousCoverage(result.sceneTiming, result.totalDurationInFrames);
      });
    });

    describe('Short Videos (<30s)', () => {
      it('should use uniform 1.5s intervals for videos shorter than 30s', () => {
        const result = calculateScenePacing(10, 8, 30);

        expect(result.totalDurationInSeconds).toBe(10);
        expect(result.hookScenes).toBe(8);
        expect(result.bodyScenes).toBe(0);

        // All scenes should use 1.5s intervals
        result.sceneTiming.forEach((scene) => {
          expect(scene.durationInSeconds).toBe(1.5);
        });
      });

      it('should handle edge case: 15s video (exactly half hook duration)', () => {
        const result = calculateScenePacing(15, 10, 30);

        expect(result.totalDurationInSeconds).toBe(15);
        expect(result.hookScenes).toBe(10);
        expect(result.bodyScenes).toBe(0);

        verifyContinuousCoverage(result.sceneTiming, result.totalDurationInFrames);
      });

      it('should handle very short video (5s, 4 scenes)', () => {
        const result = calculateScenePacing(5, 4, 30);

        expect(result.totalDurationInSeconds).toBe(5);
        expect(result.hookScenes).toBe(4);
        expect(result.bodyScenes).toBe(0);

        verifyContinuousCoverage(result.sceneTiming, result.totalDurationInFrames);
      });
    });

    describe('Edge Cases', () => {
      it('should handle single scene video', () => {
        const result = calculateScenePacing(60, 1, 30);

        expect(result.sceneTiming.length).toBe(1);
        expect(result.sceneTiming[0].durationInSeconds).toBeCloseTo(60, 1);
        expect(result.sceneTiming[0].startFrame).toBe(0);
      });

      it('should handle many scenes (50 scenes in 60s)', () => {
        const result = calculateScenePacing(60, 50, 30);

        expect(result.sceneTiming.length).toBe(50);

        verifyContinuousCoverage(result.sceneTiming, result.totalDurationInFrames);
      });

      it('should handle different FPS (60fps)', () => {
        const result = calculateScenePacing(60, 12, 60);

        expect(result.totalDurationInFrames).toBe(3600); // 60s * 60fps

        verifyContinuousCoverage(result.sceneTiming, result.totalDurationInFrames);
      });

      it('should handle different FPS (24fps)', () => {
        const result = calculateScenePacing(60, 12, 24);

        expect(result.totalDurationInFrames).toBe(1440); // 60s * 24fps

        verifyContinuousCoverage(result.sceneTiming, result.totalDurationInFrames);
      });

      it('should adjust last scene to fill exactly to the end (rounding fix)', () => {
        const result = calculateScenePacing(61, 12, 30);

        // Last scene should end exactly at total frames
        const lastScene = result.sceneTiming[result.sceneTiming.length - 1];
        const lastFrameEnd = lastScene.startFrame + lastScene.durationInFrames;

        expect(lastFrameEnd).toBe(result.totalDurationInFrames);
      });

      it('should handle scenario where all scenes fit in hook period', () => {
        const result = calculateScenePacing(60, 5, 30);

        // With only 5 scenes and 60s duration, proportionally all might fit in hook
        expect(result.hookScenes + result.bodyScenes).toBe(5);

        verifyContinuousCoverage(result.sceneTiming, result.totalDurationInFrames);
      });
    });

    describe('Input Validation', () => {
      it('should throw error for zero duration', () => {
        expect(() => calculateScenePacing(0, 10, 30)).toThrow('Invalid avatar duration');
      });

      it('should throw error for negative duration', () => {
        expect(() => calculateScenePacing(-10, 10, 30)).toThrow('Invalid avatar duration');
      });

      it('should throw error for zero scenes', () => {
        expect(() => calculateScenePacing(60, 0, 30)).toThrow('Invalid scene count');
      });

      it('should throw error for negative scenes', () => {
        expect(() => calculateScenePacing(60, -5, 30)).toThrow('Invalid scene count');
      });

      it('should throw error for zero FPS', () => {
        expect(() => calculateScenePacing(60, 10, 0)).toThrow('Invalid FPS');
      });

      it('should throw error for negative FPS', () => {
        expect(() => calculateScenePacing(60, 10, -30)).toThrow('Invalid FPS');
      });
    });
  });

  describe('calculateTranscriptBasedPacing (Word/Sentence-Based)', () => {
    describe('Standard Cases', () => {
      it('should use time-based pacing when no word timestamps provided', () => {
        const result = calculateTranscriptBasedPacing({
          avatarDurationSeconds: 60,
          wordTimestamps: [],
          sceneCount: 12,
          fps: 30,
        });

        // Should fallback to time-based pacing
        expect(result.totalDurationInSeconds).toBe(60);
        expect(result.sceneTiming.length).toBe(12);

        verifyContinuousCoverage(result.sceneTiming, result.totalDurationInFrames);
      });

      it('should distribute scenes in hook phase based on words', () => {
        const wordTimestamps: WordTimestamp[] = generateMockWords(0, 30, 100); // 100 words in first 30s

        const result = calculateTranscriptBasedPacing({
          avatarDurationSeconds: 60,
          wordTimestamps,
          sceneCount: 20,
          fps: 30,
        });

        expect(result.totalDurationInSeconds).toBe(60);
        expect(result.sceneTiming.length).toBe(20);
        expect(result.hookScenes).toBeGreaterThan(0);

        verifyContinuousCoverage(result.sceneTiming, result.totalDurationInFrames);
      });

      it('should use fallback distribution when sentence detection fails', () => {
        // Create words without sentence boundaries (no punctuation)
        const wordTimestamps: WordTimestamp[] = generateMockWords(0, 60, 200);

        const result = calculateTranscriptBasedPacing({
          avatarDurationSeconds: 60,
          wordTimestamps,
          sceneCount: 20,
          fps: 30,
        });

        // Should create 20 scenes with continuous coverage
        expect(result.sceneTiming.length).toBe(20);

        verifyContinuousCoverage(result.sceneTiming, result.totalDurationInFrames);
      });
    });

    describe('Edge Cases', () => {
      it('should handle very short video with many words', () => {
        const wordTimestamps: WordTimestamp[] = generateMockWords(0, 10, 50);

        const result = calculateTranscriptBasedPacing({
          avatarDurationSeconds: 10,
          wordTimestamps,
          sceneCount: 8,
          fps: 30,
        });

        expect(result.sceneTiming.length).toBe(8);

        verifyContinuousCoverage(result.sceneTiming, result.totalDurationInFrames);
      });

      it('should handle few words, many scenes', () => {
        const wordTimestamps: WordTimestamp[] = generateMockWords(0, 60, 10);

        const result = calculateTranscriptBasedPacing({
          avatarDurationSeconds: 60,
          wordTimestamps,
          sceneCount: 20,
          fps: 30,
        });

        expect(result.sceneTiming.length).toBe(20);

        verifyContinuousCoverage(result.sceneTiming, result.totalDurationInFrames);
      });

      it('should ensure exactly sceneCount timings are created', () => {
        const wordTimestamps: WordTimestamp[] = generateMockWords(0, 60, 100);

        // Test with various scene counts
        [1, 5, 10, 20, 50].forEach((sceneCount) => {
          const result = calculateTranscriptBasedPacing({
            avatarDurationSeconds: 60,
            wordTimestamps,
            sceneCount,
            fps: 30,
          });

          expect(result.sceneTiming.length).toBe(sceneCount);
          verifyContinuousCoverage(result.sceneTiming, result.totalDurationInFrames);
        });
      });

      it('should handle custom FPS', () => {
        const wordTimestamps: WordTimestamp[] = generateMockWords(0, 60, 100);

        const result = calculateTranscriptBasedPacing({
          avatarDurationSeconds: 60,
          wordTimestamps,
          sceneCount: 12,
          fps: 60,
        });

        expect(result.totalDurationInFrames).toBe(3600); // 60s * 60fps

        verifyContinuousCoverage(result.sceneTiming, result.totalDurationInFrames);
      });
    });
  });

  describe('Frame-Perfect Coverage', () => {
    it('should have NO GAPS between scenes (60s, 12 scenes)', () => {
      const result = calculateScenePacing(60, 12, 30);

      verifyNoGaps(result.sceneTiming);
    });

    it('should have NO GAPS between scenes (120s, 20 scenes)', () => {
      const result = calculateScenePacing(120, 20, 30);

      verifyNoGaps(result.sceneTiming);
    });

    it('should have NO GAPS between scenes (10s, 8 scenes)', () => {
      const result = calculateScenePacing(10, 8, 30);

      verifyNoGaps(result.sceneTiming);
    });

    it('should cover entire duration exactly', () => {
      const durations = [10, 30, 60, 90, 120];
      const sceneCounts = [5, 10, 15, 20];

      durations.forEach((duration) => {
        sceneCounts.forEach((sceneCount) => {
          const result = calculateScenePacing(duration, sceneCount, 30);

          // First scene starts at frame 0
          expect(result.sceneTiming[0].startFrame).toBe(0);

          // Last scene ends exactly at total frames
          const lastScene = result.sceneTiming[result.sceneTiming.length - 1];
          const lastFrameEnd = lastScene.startFrame + lastScene.durationInFrames;

          expect(lastFrameEnd).toBe(result.totalDurationInFrames);
        });
      });
    });

    it('should have continuous frame coverage with no overlaps', () => {
      const result = calculateScenePacing(60, 12, 30);

      for (let i = 1; i < result.sceneTiming.length; i++) {
        const prevScene = result.sceneTiming[i - 1];
        const currScene = result.sceneTiming[i];

        const prevEnd = prevScene.startFrame + prevScene.durationInFrames;

        // Current scene should start exactly where previous ended
        expect(currScene.startFrame).toBe(prevEnd);
      }
    });
  });
});

/**
 * Helper: Verify continuous coverage (no gaps, no overlaps)
 */
function verifyContinuousCoverage(sceneTiming: SceneTiming[], totalFrames: number): void {
  // First scene starts at 0
  expect(sceneTiming[0].startFrame).toBe(0);

  // Each scene starts where previous ended
  for (let i = 1; i < sceneTiming.length; i++) {
    const prevScene = sceneTiming[i - 1];
    const currScene = sceneTiming[i];

    const prevEnd = prevScene.startFrame + prevScene.durationInFrames;
    expect(currScene.startFrame).toBe(prevEnd);
  }

  // Last scene ends at total frames
  const lastScene = sceneTiming[sceneTiming.length - 1];
  const lastEnd = lastScene.startFrame + lastScene.durationInFrames;
  expect(lastEnd).toBe(totalFrames);
}

/**
 * Helper: Verify no gaps between scenes
 */
function verifyNoGaps(sceneTiming: SceneTiming[]): void {
  for (let i = 1; i < sceneTiming.length; i++) {
    const prevScene = sceneTiming[i - 1];
    const currScene = sceneTiming[i];

    const prevEnd = prevScene.startFrame + prevScene.durationInFrames;
    const gap = currScene.startFrame - prevEnd;

    expect(gap).toBe(0);
  }
}

/**
 * Helper: Generate mock word timestamps for testing
 */
function generateMockWords(startTime: number, endTime: number, count: number): WordTimestamp[] {
  const words: WordTimestamp[] = [];
  const interval = (endTime - startTime) / count;

  for (let i = 0; i < count; i++) {
    const start = startTime + i * interval;
    const end = start + interval * 0.8; // Leave small gap

    words.push({
      word: `word${i}`,
      start,
      end,
    });
  }

  return words;
}
