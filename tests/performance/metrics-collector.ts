/**
 * Performance Metrics Collector
 *
 * Utility for capturing and analyzing performance metrics during load tests.
 * Tracks response times, queue depths, resource utilization, and more.
 */

import { pool } from '@/lib/db';

export interface PerformanceMetrics {
  timestamp: number;
  responseTimes: number[];
  queueDepth: number;
  dbPoolStats: {
    total: number;
    idle: number;
    waiting: number;
  };
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}

export class MetricsCollector {
  private metrics: PerformanceMetrics[] = [];
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Capture current metrics snapshot
   */
  async capture(responseTimes: number[] = []): Promise<void> {
    const metrics: PerformanceMetrics = {
      timestamp: Date.now() - this.startTime,
      responseTimes,
      queueDepth: await this.getQueueDepth(),
      dbPoolStats: await this.getDbPoolStats(),
      memoryUsage: this.getMemoryUsage(),
    };

    this.metrics.push(metrics);
  }

  /**
   * Get current queue depth (pending + analyzing jobs)
   */
  private async getQueueDepth(): Promise<number> {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as depth
         FROM news_jobs
         WHERE status IN ('pending', 'analyzing', 'generating_images')`
      );
      return parseInt(result.rows[0].depth);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get database pool statistics
   */
  private async getDbPoolStats(): Promise<{ total: number; idle: number; waiting: number }> {
    try {
      const stats = pool.getPoolStats();
      return {
        total: stats.total,
        idle: stats.idle,
        waiting: stats.waiting,
      };
    } catch (error) {
      return { total: 0, idle: 0, waiting: 0 };
    }
  }

  /**
   * Get Node.js memory usage
   */
  private getMemoryUsage(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  } {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
    };
  }

  /**
   * Calculate statistics for response times
   */
  private calculateStats(values: number[]): {
    min: number;
    max: number;
    mean: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    if (values.length === 0) {
      return { min: 0, max: 0, mean: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = values.slice().sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: sum / sorted.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  /**
   * Get summary of all collected metrics
   */
  getSummary(): {
    duration: number;
    totalSnapshots: number;
    responseTimes: {
      min: number;
      max: number;
      mean: number;
      p50: number;
      p95: number;
      p99: number;
    };
    queueDepth: {
      min: number;
      max: number;
      mean: number;
    };
    dbPool: {
      maxWaiting: number;
      avgIdle: number;
    };
    memory: {
      heapGrowth: number;
      heapGrowthPercent: number;
      maxRss: number;
    };
  } {
    if (this.metrics.length === 0) {
      throw new Error('No metrics collected');
    }

    // Flatten all response times
    const allResponseTimes = this.metrics.flatMap(m => m.responseTimes);

    // Queue depth stats
    const queueDepths = this.metrics.map(m => m.queueDepth);
    const minQueueDepth = Math.min(...queueDepths);
    const maxQueueDepth = Math.max(...queueDepths);
    const meanQueueDepth = queueDepths.reduce((a, b) => a + b, 0) / queueDepths.length;

    // DB pool stats
    const maxWaiting = Math.max(...this.metrics.map(m => m.dbPoolStats.waiting));
    const avgIdle =
      this.metrics.reduce((sum, m) => sum + m.dbPoolStats.idle, 0) / this.metrics.length;

    // Memory stats
    const firstHeap = this.metrics[0].memoryUsage.heapUsed;
    const lastHeap = this.metrics[this.metrics.length - 1].memoryUsage.heapUsed;
    const heapGrowth = lastHeap - firstHeap;
    const heapGrowthPercent = (heapGrowth / firstHeap) * 100;
    const maxRss = Math.max(...this.metrics.map(m => m.memoryUsage.rss));

    return {
      duration: Date.now() - this.startTime,
      totalSnapshots: this.metrics.length,
      responseTimes: this.calculateStats(allResponseTimes),
      queueDepth: {
        min: minQueueDepth,
        max: maxQueueDepth,
        mean: meanQueueDepth,
      },
      dbPool: {
        maxWaiting,
        avgIdle,
      },
      memory: {
        heapGrowth,
        heapGrowthPercent,
        maxRss,
      },
    };
  }

  /**
   * Format summary as human-readable string
   */
  formatSummary(): string {
    const summary = this.getSummary();

    return `
Performance Test Summary
========================
Duration: ${summary.duration}ms
Snapshots: ${summary.totalSnapshots}

Response Times:
  Min: ${summary.responseTimes.min}ms
  Max: ${summary.responseTimes.max}ms
  Mean: ${summary.responseTimes.mean.toFixed(2)}ms
  p50: ${summary.responseTimes.p50}ms
  p95: ${summary.responseTimes.p95}ms
  p99: ${summary.responseTimes.p99}ms

Queue Depth:
  Min: ${summary.queueDepth.min}
  Max: ${summary.queueDepth.max}
  Mean: ${summary.queueDepth.mean.toFixed(2)}

Database Pool:
  Max Waiting: ${summary.dbPool.maxWaiting}
  Avg Idle: ${summary.dbPool.avgIdle.toFixed(2)}

Memory:
  Heap Growth: ${(summary.memory.heapGrowth / 1024 / 1024).toFixed(2)} MB (${summary.memory.heapGrowthPercent.toFixed(1)}%)
  Max RSS: ${(summary.memory.maxRss / 1024 / 1024).toFixed(2)} MB
    `.trim();
  }

  /**
   * Export metrics as JSON
   */
  exportJson(): string {
    return JSON.stringify(
      {
        startTime: this.startTime,
        endTime: Date.now(),
        summary: this.getSummary(),
        rawMetrics: this.metrics,
      },
      null,
      2
    );
  }

  /**
   * Clear all collected metrics
   */
  reset(): void {
    this.metrics = [];
    this.startTime = Date.now();
  }
}
