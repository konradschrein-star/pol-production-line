/**
 * Metrics Manager Tests
 *
 * Unit tests for production metrics recording system.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsManager } from '@/lib/metrics/manager';

// Mock database
vi.mock('@/lib/db', () => ({
  db: {
    query: vi.fn(),
  },
}));

import { db } from '@/lib/db';

describe('MetricsManager', () => {
  let manager: MetricsManager;

  beforeEach(() => {
    manager = new MetricsManager();
    vi.clearAllMocks();
  });

  describe('recordJobMetrics', () => {
    it('should insert new job metrics', async () => {
      const mockMetrics = {
        jobId: 'job-123',
        analysisTimeMs: 5000,
        sceneCount: 8,
        aiProvider: 'openai',
      };

      (db.query as any).mockResolvedValueOnce({ rows: [] });

      await manager.recordJobMetrics(mockMetrics);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO job_metrics'),
        expect.arrayContaining(['job-123', 5000])
      );
    });

    it('should not throw on database errors', async () => {
      (db.query as any).mockRejectedValueOnce(new Error('DB error'));

      // Should not throw
      await expect(
        manager.recordJobMetrics({
          jobId: 'job-456',
          analysisTimeMs: 1000,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('recordGenerationAttempt', () => {
    it('should record successful generation attempt', async () => {
      const mockAttempt = {
        sceneId: 'scene-123',
        jobId: 'job-123',
        attemptNumber: 1,
        imageUrl: 'https://example.com/image.jpg',
        generationTimeMs: 15000,
        success: true,
      };

      (db.query as any).mockResolvedValueOnce({ rows: [] });

      await manager.recordGenerationAttempt(mockAttempt);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO generation_history'),
        expect.arrayContaining(['scene-123', 'job-123', 1, true])
      );
    });

    it('should record failed attempt with error message', async () => {
      const mockAttempt = {
        sceneId: 'scene-456',
        jobId: 'job-123',
        attemptNumber: 2,
        success: false,
        errorMessage: 'Content policy violation',
      };

      (db.query as any).mockResolvedValueOnce({ rows: [] });

      await manager.recordGenerationAttempt(mockAttempt);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO generation_history'),
        expect.arrayContaining([false, 'Content policy violation'])
      );
    });
  });

  describe('calculateTotalImageGenTime', () => {
    it('should sum successful generation times', async () => {
      (db.query as any).mockResolvedValueOnce({
        rows: [{ total: '45000' }],
      });

      const result = await manager.calculateTotalImageGenTime('job-123');

      expect(result).toBe(45000);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SUM(generation_time_ms)'),
        ['job-123']
      );
    });

    it('should return 0 if no generations found', async () => {
      (db.query as any).mockResolvedValueOnce({
        rows: [{ total: null }],
      });

      const result = await manager.calculateTotalImageGenTime('job-456');

      expect(result).toBe(0);
    });
  });

  describe('recordAnalysisComplete', () => {
    it('should record analysis metrics', async () => {
      const spy = vi.spyOn(manager, 'recordJobMetrics');

      await manager.recordAnalysisComplete('job-123', 8000, 'claude');

      expect(spy).toHaveBeenCalledWith({
        jobId: 'job-123',
        analysisTimeMs: 8000,
        aiProvider: 'claude',
      });
    });
  });

  describe('recordRenderComplete', () => {
    it('should record render metrics with video details', async () => {
      const spy = vi.spyOn(manager, 'recordJobMetrics');

      await manager.recordRenderComplete('job-123', 120000, 60, 21000000);

      expect(spy).toHaveBeenCalledWith({
        jobId: 'job-123',
        renderTimeMs: 120000,
        videoLengthSeconds: 60,
        fileSize: 21000000,
      });
    });
  });

  describe('finalizeJobMetrics', () => {
    it('should calculate total processing time', async () => {
      const createdAt = new Date('2026-03-25T10:00:00Z');
      const completedAt = new Date('2026-03-25T10:30:00Z');

      (db.query as any)
        .mockResolvedValueOnce({
          rows: [{ created_at: createdAt, completed_at: completedAt }],
        })
        .mockResolvedValueOnce({
          rows: [{ count: '8' }],
        })
        .mockResolvedValueOnce({ rows: [] });

      await manager.finalizeJobMetrics('job-123');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO job_metrics'),
        expect.arrayContaining(['job-123', 1800000, 8]) // 30 minutes in ms
      );
    });
  });

  describe('getJobMetrics', () => {
    it('should return job metrics if found', async () => {
      const mockMetrics = {
        job_id: 'job-123',
        analysis_time_ms: 5000,
        total_image_gen_time_ms: 45000,
        render_time_ms: 120000,
        total_processing_time_ms: 1800000,
        scene_count: 8,
        video_length_seconds: 60,
        file_size: 21000000,
        ai_provider: 'openai',
      };

      (db.query as any).mockResolvedValueOnce({
        rows: [mockMetrics],
      });

      const result = await manager.getJobMetrics('job-123');

      expect(result).toEqual({
        jobId: 'job-123',
        analysisTimeMs: 5000,
        totalImageGenTimeMs: 45000,
        renderTimeMs: 120000,
        totalProcessingTimeMs: 1800000,
        sceneCount: 8,
        videoLengthSeconds: 60,
        fileSize: 21000000,
        aiProvider: 'openai',
      });
    });

    it('should return null if not found', async () => {
      (db.query as any).mockResolvedValueOnce({ rows: [] });

      const result = await manager.getJobMetrics('job-456');

      expect(result).toBeNull();
    });
  });
});
