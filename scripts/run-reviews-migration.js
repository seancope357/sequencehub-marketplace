#!/usr/bin/env node

/**
 * Run Reviews System Migration
 * Applies 004_add_reviews_system.sql to the Supabase PostgreSQL database
 */

const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔍 Loading migration file...');

    const migrationPath = path.join(__dirname, '..', 'migrations', '004_add_reviews_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📦 Installing pg library...');
    const { execSync } = require('child_process');
    try {
      execSync('bun add pg', { stdio: 'inherit' });
    } catch (error) {
      console.log('pg library already installed or install failed, continuing...');
    }

    console.log('🔌 Connecting to database...');
    const { Client } = require('pg');

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL');

    // Check if Review table already exists
    console.log('\n🔍 Checking if reviews system already exists...');
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'Review'
      );
    `);

    if (checkResult.rows[0].exists) {
      console.log('⚠️  Review table already exists! Migration may have already been run.');
      console.log('Do you want to continue anyway? This might cause errors.');
      await client.end();
      return;
    }

    console.log('✅ Reviews system not found - safe to proceed\n');

    // Split migration into separate statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

    console.log(`📝 Running ${statements.length} migration statements...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments
      if (statement.startsWith('--')) continue;

      try {
        // Show what we're running
        const preview = statement.substring(0, 100).replace(/\n/g, ' ');
        console.log(`[${i + 1}/${statements.length}] ${preview}...`);

        await client.query(statement);
        successCount++;
        console.log(`  ✅ Success\n`);
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Error: ${error.message}\n`);

        // Continue on some errors (like enum already exists)
        if (error.message.includes('already exists')) {
          console.log('  ⚠️  Continuing despite error (already exists)...\n');
        } else {
          throw error; // Stop on serious errors
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Failed: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    // Verify tables were created
    console.log('🔍 Verifying tables were created...\n');

    const verifyResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('Review', 'ReviewVote', 'ReviewResponse')
      ORDER BY table_name;
    `);

    console.log('Created tables:');
    verifyResult.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });

    // Check Product table columns
    console.log('\n🔍 Verifying Product table columns...\n');
    const columnResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'Product'
      AND column_name IN ('averageRating', 'reviewCount', 'ratingDistribution')
      ORDER BY column_name;
    `);

    console.log('New Product columns:');
    columnResult.rows.forEach(row => {
      console.log(`  ✅ ${row.column_name} (${row.data_type})`);
    });

    await client.end();

    console.log('\n✅ Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Run: bun run db:generate (to regenerate Prisma client)');
    console.log('  2. Test review API endpoints');
    console.log('  3. Build review UI components\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
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

runMigration();
