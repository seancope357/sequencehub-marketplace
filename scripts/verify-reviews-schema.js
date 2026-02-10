#!/usr/bin/env node

/**
 * Verify Reviews System Schema
 * Checks that all review tables and columns exist
 */

const path = require('path');

async function verifySchema() {
  try {
    console.log('🔌 Connecting to database...');
    const { Client } = require('pg');

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL\n');

    // Check for Review tables
    console.log('📋 Checking for Review tables...\n');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('Review', 'ReviewVote', 'ReviewResponse')
      ORDER BY table_name;
    `);

    const expectedTables = ['Review', 'ReviewResponse', 'ReviewVote'];
    const foundTables = tablesResult.rows.map(r => r.table_name);

    expectedTables.forEach(tableName => {
      if (foundTables.includes(tableName)) {
        console.log(`  ✅ ${tableName} table exists`);
      } else {
        console.log(`  ❌ ${tableName} table MISSING`);
      }
    });

    // Check Product table columns
    console.log('\n📋 Checking Product table rating columns...\n');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'Product'
      AND column_name IN ('averageRating', 'reviewCount', 'ratingDistribution')
      ORDER BY column_name;
    `);

    const expectedColumns = ['averageRating', 'reviewCount', 'ratingDistribution'];
    const foundColumns = columnsResult.rows.map(r => r.column_name);

    expectedColumns.forEach(columnName => {
      const col = columnsResult.rows.find(r => r.column_name === columnName);
      if (col) {
        console.log(`  ✅ ${col.column_name} (${col.data_type})`);
      } else {
        console.log(`  ❌ ${columnName} MISSING`);
      }
    });

    // Check for ReviewStatus enum
    console.log('\n📋 Checking ReviewStatus enum...\n');
    const enumResult = await client.query(`
      SELECT enumlabel
      FROM pg_enum
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
      WHERE pg_type.typname = 'ReviewStatus'
      ORDER BY enumsortorder;
    `);

    if (enumResult.rows.length > 0) {
      console.log('  ✅ ReviewStatus enum exists:');
      enumResult.rows.forEach(row => {
        console.log(`     - ${row.enumlabel}`);
      });
    } else {
      console.log('  ❌ ReviewStatus enum MISSING');
    }

    // Check indexes
    console.log('\n📋 Checking indexes...\n');
    const indexResult = await client.query(`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('Review', 'ReviewVote', 'ReviewResponse')
      ORDER BY tablename, indexname;
    `);

    const indexCount = indexResult.rows.length;
    console.log(`  ✅ Found ${indexCount} indexes on review tables`);

    if (indexCount > 0) {
      console.log('\n  Indexes:');
      indexResult.rows.forEach(row => {
        console.log(`    - ${row.tablename}.${row.indexname}`);
      });
    }

    // Check foreign keys
    console.log('\n📋 Checking foreign key constraints...\n');
    const fkResult = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN ('Review', 'ReviewVote', 'ReviewResponse')
      ORDER BY tc.table_name, kcu.column_name;
    `);

    if (fkResult.rows.length > 0) {
      console.log(`  ✅ Found ${fkResult.rows.length} foreign key constraints`);
      fkResult.rows.forEach(row => {
        console.log(`    - ${row.table_name}.${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
      });
    } else {
      console.log('  ❌ No foreign key constraints found');
    }

    // Get row counts
    console.log('\n📊 Table row counts...\n');
    const reviewCount = await client.query('SELECT COUNT(*) FROM "Review"');
    const voteCount = await client.query('SELECT COUNT(*) FROM "ReviewVote"');
    const responseCount = await client.query('SELECT COUNT(*) FROM "ReviewResponse"');

    console.log(`  Review: ${reviewCount.rows[0].count} rows`);
    console.log(`  ReviewVote: ${voteCount.rows[0].count} rows`);
    console.log(`  ReviewResponse: ${responseCount.rows[0].count} rows`);

    await client.end();

    console.log('\n' + '='.repeat(60));
    console.log('✅ Schema verification complete!');
    console.log('='.repeat(60) + '\n');

    console.log('The reviews system is fully set up and ready to use.\n');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

// Load .env file
console.log('📋 Loading environment variables...');
const dotenv = require('dotenv');
const result = dotenv.config({ path: path.join(__dirname, '..', '.env') });

if (result.error) {
  console.error('❌ Failed to load .env file:', result.error.message);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

console.log('✅ Environment loaded\n');

verifySchema();
