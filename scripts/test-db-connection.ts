#!/usr/bin/env tsx
/**
 * Database Connection Test
 * Validates PostgreSQL connection and runs basic queries
 */

import 'dotenv/config';
import { db } from '../src/lib/db';

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');

  try {
    // Test 1: Basic connection
    console.log('📡 Testing connection...');
    const result = await db.query('SELECT NOW() as current_time, version()');

    console.log('✅ Connection successful');
    console.log(`   Server time: ${result.rows[0].current_time}`);
    console.log(`   Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}\n`);

    // Test 2: Check required tables exist
    console.log('📋 Checking tables...');
    const tables = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const requiredTables = ['news_jobs', 'news_scenes', 'style_presets'];
    const existingTables = tables.rows.map((r) => r.table_name);

    let allTablesExist = true;

    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} (missing)`);
        allTablesExist = false;
      }
    }

    if (!allTablesExist) {
      console.log('\n⚠️  Some tables are missing. Run:');
      console.log('   npm run init-db');
      process.exit(1);
    }

    // Test 3: Check job counts
    console.log('\n📊 Database statistics:');

    const jobCount = await db.query('SELECT COUNT(*) as count FROM news_jobs');
    console.log(`   Jobs: ${jobCount.rows[0].count}`);

    const sceneCount = await db.query('SELECT COUNT(*) as count FROM news_scenes');
    console.log(`   Scenes: ${sceneCount.rows[0].count}`);

    const presetCount = await db.query('SELECT COUNT(*) as count FROM style_presets');
    console.log(`   Style presets: ${presetCount.rows[0].count}`);

    // Test 4: Check recent activity
    const recentJobs = await db.query(`
      SELECT status, COUNT(*) as count
      FROM news_jobs
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY status
      ORDER BY count DESC
    `);

    if (recentJobs.rows.length > 0) {
      console.log('\n📅 Recent activity (last 7 days):');
      recentJobs.rows.forEach((row) => {
        console.log(`   ${row.status}: ${row.count}`);
      });
    }

    console.log('\n🎉 Database is healthy and ready!');
    process.exit(0);

  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('\nFix:');
      console.log('  1. Make sure Docker is running');
      console.log('  2. Start containers: START.bat');
      console.log('  3. Check Docker status: docker ps');
    } else if (error.code === '3D000') {
      console.log('\nFix:');
      console.log('  Database does not exist. Run:');
      console.log('  npm run init-db');
    } else {
      console.log('\nCheck DATABASE_URL in .env file:');
      console.log(`  Current: ${process.env.DATABASE_URL?.substring(0, 40)}...`);
    }

    process.exit(1);
  }
}

testDatabaseConnection();
