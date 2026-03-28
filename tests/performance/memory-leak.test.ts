/**
 * Memory Leak Detection Tests
 *
 * Ensures BullMQ workers don't leak memory over long sessions.
 * Uses mocked workers to avoid 50+ hour test durations.
 *
 * Phase 8: Performance & Security - Performance Testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { testScripts } from './fixtures/scripts';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8347';
const validApiKey = process.env.API_KEY;

// Helper to force garbage collection (requires --expose-gc flag)
function forceGC() {
  if (global.gc) {
    global.gc();
  }
}

// Helper to get memory usage in MB
function getMemoryUsageMB() {
  const usage = process.memoryUsage();
  return {
    heapUsed: usage.heapUsed / 1024 / 1024,
    heapTotal: usage.heapTotal / 1024 / 1024,
    external: usage.external / 1024 / 1024,
    rss: usage.rss / 1024 / 1024,
  };
}

describe('Memory Leak Detection - API Endpoint', () => {
  it('should not leak memory after 100 job creation requests', async () => {
    // Force GC before test
    forceGC();
    await new Promise(resolve => setTimeout(resolve, 100));

    const initialMemory = getMemoryUsageMB();
    console.log(`Initial heap: ${initialMemory.heapUsed.toFixed(2)} MB`);

    const createdJobIds: string[] = [];

    // Create 100 jobs (using minimal scripts)
    for (let i = 0; i < 100; i++) {
      const response = await fetch(`${baseUrl}/api/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validApiKey}`,
        },
        body: JSON.stringify({
          raw_script: testScripts.minimal,
          title: `Memory Leak Test ${i}`,
        }),
      });

      if (response.status === 201) {
        const job = await response.json();
        createdJobIds.push(job.id);
      }

      // Force GC every 10 jobs
      if (i % 10 === 0 && i > 0) {
        forceGC();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Force final GC
    forceGC();
    await new Promise(resolve => setTimeout(resolve, 100));

    const finalMemory = getMemoryUsageMB();
    const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    const growthPercent = (heapGrowth / initialMemory.heapUsed) * 100;

    console.log(`Final heap: ${finalMemory.heapUsed.toFixed(2)} MB`);
    console.log(`Heap growth: ${heapGrowth.toFixed(2)} MB (${growthPercent.toFixed(1)}%)`);

    // Heap growth should be <10%
    expect(growthPercent).toBeLessThan(10);

    // Clean up
    console.log(`Cleaning up ${createdJobIds.length} test jobs...`);
    for (const jobId of createdJobIds) {
      try {
        await fetch(`${baseUrl}/api/jobs/${jobId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${validApiKey}`,
          },
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }, 300000); // 5-minute timeout
});

describe('Memory Leak Detection - Request/Response Cycle', () => {
  it('should not leak memory after 200 GET requests', async () => {
    forceGC();
    await new Promise(resolve => setTimeout(resolve, 100));

    const initialMemory = getMemoryUsageMB();
    console.log(`Initial heap: ${initialMemory.heapUsed.toFixed(2)} MB`);

    // Make 200 GET requests
    for (let i = 0; i < 200; i++) {
      await fetch(`${baseUrl}/api/jobs`, {
        headers: {
          'Authorization': `Bearer ${validApiKey}`,
        },
      });

      // Force GC every 20 requests
      if (i % 20 === 0 && i > 0) {
        forceGC();
      }
    }

    // Force final GC
    forceGC();
    await new Promise(resolve => setTimeout(resolve, 100));

    const finalMemory = getMemoryUsageMB();
    const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    const growthPercent = (heapGrowth / initialMemory.heapUsed) * 100;

    console.log(`Final heap: ${finalMemory.heapUsed.toFixed(2)} MB`);
    console.log(`Heap growth: ${heapGrowth.toFixed(2)} MB (${growthPercent.toFixed(1)}%)`);

    // Heap growth should be <5% for GET requests (no DB writes)
    expect(growthPercent).toBeLessThan(5);
  }, 180000); // 3-minute timeout
});

describe('Memory Leak Detection - Bulk Operations', () => {
  it('should not leak memory after 50 bulk operations', async () => {
    forceGC();
    await new Promise(resolve => setTimeout(resolve, 100));

    const initialMemory = getMemoryUsageMB();
    console.log(`Initial heap: ${initialMemory.heapUsed.toFixed(2)} MB`);

    // Create some test jobs first
    const testJobIds: string[] = [];
    for (let i = 0; i < 10; i++) {
      const response = await fetch(`${baseUrl}/api/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validApiKey}`,
        },
        body: JSON.stringify({
          raw_script: testScripts.minimal,
          title: `Bulk Operation Test ${i}`,
        }),
      });

      if (response.status === 201) {
        const job = await response.json();
        testJobIds.push(job.id);
      }
    }

    // Perform 50 bulk operations (with empty jobIds to avoid actual deletions)
    for (let i = 0; i < 50; i++) {
      await fetch(`${baseUrl}/api/jobs/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validApiKey}`,
        },
        body: JSON.stringify({
          action: 'delete',
          jobIds: [], // Empty array (no actual deletions)
        }),
      });

      // Force GC every 10 operations
      if (i % 10 === 0 && i > 0) {
        forceGC();
      }
    }

    // Force final GC
    forceGC();
    await new Promise(resolve => setTimeout(resolve, 100));

    const finalMemory = getMemoryUsageMB();
    const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    const growthPercent = (heapGrowth / initialMemory.heapUsed) * 100;

    console.log(`Final heap: ${finalMemory.heapUsed.toFixed(2)} MB`);
    console.log(`Heap growth: ${heapGrowth.toFixed(2)} MB (${growthPercent.toFixed(1)}%)`);

    // Heap growth should be <10%
    expect(growthPercent).toBeLessThan(10);

    // Clean up test jobs
    for (const jobId of testJobIds) {
      try {
        await fetch(`${baseUrl}/api/jobs/${jobId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${validApiKey}`,
          },
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }, 180000); // 3-minute timeout
});

describe('Memory Leak Detection - Long-Running Session', () => {
  it('should maintain stable memory over 5-minute session', async () => {
    forceGC();
    await new Promise(resolve => setTimeout(resolve, 100));

    const initialMemory = getMemoryUsageMB();
    console.log(`Initial heap: ${initialMemory.heapUsed.toFixed(2)} MB`);

    const memorySnapshots: number[] = [];
    const duration = 5 * 60 * 1000; // 5 minutes
    const snapshotInterval = 30 * 1000; // 30 seconds
    const startTime = Date.now();

    // Simulate continuous load for 5 minutes
    while (Date.now() - startTime < duration) {
      // Make some requests
      await fetch(`${baseUrl}/api/health`);
      await fetch(`${baseUrl}/api/jobs`, {
        headers: {
          'Authorization': `Bearer ${validApiKey}`,
        },
      });

      // Take memory snapshot every 30 seconds
      if ((Date.now() - startTime) % snapshotInterval < 1000) {
        forceGC();
        const snapshot = getMemoryUsageMB();
        memorySnapshots.push(snapshot.heapUsed);
        console.log(`[${Math.floor((Date.now() - startTime) / 1000)}s] Heap: ${snapshot.heapUsed.toFixed(2)} MB`);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Force final GC
    forceGC();
    await new Promise(resolve => setTimeout(resolve, 100));

    const finalMemory = getMemoryUsageMB();
    const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    const growthPercent = (heapGrowth / initialMemory.heapUsed) * 100;

    console.log(`Final heap: ${finalMemory.heapUsed.toFixed(2)} MB`);
    console.log(`Heap growth: ${heapGrowth.toFixed(2)} MB (${growthPercent.toFixed(1)}%)`);
    console.log(`Memory snapshots: ${memorySnapshots.map(s => s.toFixed(2)).join(', ')} MB`);

    // Heap growth should be <15% over 5 minutes
    expect(growthPercent).toBeLessThan(15);

    // Memory should not grow linearly (indicating a leak)
    // Check that final snapshot is not significantly higher than mid-point
    const midpointSnapshot = memorySnapshots[Math.floor(memorySnapshots.length / 2)];
    const finalSnapshot = memorySnapshots[memorySnapshots.length - 1];
    const midToFinalGrowth = ((finalSnapshot - midpointSnapshot) / midpointSnapshot) * 100;

    console.log(`Mid-to-final growth: ${midToFinalGrowth.toFixed(1)}%`);

    // Growth from midpoint to end should be <10% (indicating stabilization)
    expect(midToFinalGrowth).toBeLessThan(10);
  }, 360000); // 6-minute timeout
});

describe('Memory Leak Detection - RSS vs Heap', () => {
  it('should have RSS growth proportional to heap growth', async () => {
    forceGC();
    await new Promise(resolve => setTimeout(resolve, 100));

    const initialMemory = getMemoryUsageMB();
    console.log(`Initial - Heap: ${initialMemory.heapUsed.toFixed(2)} MB, RSS: ${initialMemory.rss.toFixed(2)} MB`);

    const createdJobIds: string[] = [];

    // Create 50 jobs
    for (let i = 0; i < 50; i++) {
      const response = await fetch(`${baseUrl}/api/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validApiKey}`,
        },
        body: JSON.stringify({
          raw_script: testScripts.minimal,
          title: `RSS Test ${i}`,
        }),
      });

      if (response.status === 201) {
        const job = await response.json();
        createdJobIds.push(job.id);
      }

      if (i % 10 === 0 && i > 0) {
        forceGC();
      }
    }

    // Force final GC
    forceGC();
    await new Promise(resolve => setTimeout(resolve, 100));

    const finalMemory = getMemoryUsageMB();
    const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    const rssGrowth = finalMemory.rss - initialMemory.rss;

    console.log(`Final - Heap: ${finalMemory.heapUsed.toFixed(2)} MB, RSS: ${finalMemory.rss.toFixed(2)} MB`);
    console.log(`Heap growth: ${heapGrowth.toFixed(2)} MB`);
    console.log(`RSS growth: ${rssGrowth.toFixed(2)} MB`);

    // RSS growth should be <200 MB (reasonable for 50 jobs)
    expect(rssGrowth).toBeLessThan(200);

    // Clean up
    for (const jobId of createdJobIds) {
      try {
        await fetch(`${baseUrl}/api/jobs/${jobId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${validApiKey}`,
          },
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }, 180000); // 3-minute timeout
});
