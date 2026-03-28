import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 50, // Increased from 20 to support scene-based mode (60 scenes = ~190 queries/job)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 30000, // 30s max query time
  query_timeout: 30000,
  idle_in_transaction_session_timeout: 60000, // 60s max transaction time
  application_name: 'obsidian-news-desk',
});

// Handle pool errors to prevent crashes
pool.on('error', (err, client) => {
  console.error('💥 [DB] Unexpected pool error:', err);
  // Don't exit - let pool recover
});

pool.on('connect', (client) => {
  console.log('🔌 [DB] New client connected to pool');
});

pool.on('remove', (client) => {
  console.log('🔌 [DB] Client removed from pool');
});

export const db = {
  query: async (text: string, params?: any[]) => {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;

      // Log slow queries
      if (duration > 1000) {
        console.warn(`⚠️ [DB] Slow query (${duration}ms):`, text.substring(0, 100));
      }

      return result;
    } catch (error) {
      console.error(`❌ [DB] Query failed:`, text.substring(0, 100));
      throw error;
    }
  },

  getClient: () => pool.connect(),

  /**
   * Health check - verifies database connectivity
   * @returns true if database is healthy, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await pool.query('SELECT 1 as health');
      return result.rows[0]?.health === 1;
    } catch (error) {
      console.error('❌ [DB] Health check failed:', error);
      return false;
    }
  },

  /**
   * Get pool statistics for monitoring
   * @returns Pool statistics object
   */
  getPoolStats(): {
    total: number;
    idle: number;
    waiting: number;
  } {
    return {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    };
  },

  // Graceful shutdown
  async shutdown(): Promise<void> {
    console.log('🔌 [DB] Closing connection pool...');
    await pool.end();
    console.log('✅ [DB] Connection pool closed');
  }
};

// Handle process shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 [DB] SIGTERM received, shutting down gracefully...');
  await db.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 [DB] SIGINT received, shutting down gracefully...');
  await db.shutdown();
  process.exit(0);
});

// Export pool for tests
export { pool };

export default db;
