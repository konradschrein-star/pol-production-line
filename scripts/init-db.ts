import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function initDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Initializing database...');

    // Read schema file
    const schemaPath = path.join(__dirname, '..', 'src', 'lib', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    await pool.query(schema);

    console.log('✅ Database initialized successfully!');
    console.log('   - news_jobs table created');
    console.log('   - news_scenes table created');
    console.log('   - Indexes created');
    console.log('   - Triggers created');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

initDatabase();
