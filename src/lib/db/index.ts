import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 50, // Increased from 20 to support scene-based mode (60 scenes = ~190 queries/job)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 30000, // 30s max query time
  query_timeout: 30000,
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

export default db;
