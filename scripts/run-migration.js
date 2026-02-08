#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🔄 Running Supabase RLS & Storage Migration...\n');

  // Read the migration SQL
  const migrationPath = path.join(__dirname, '../supabase/migrations/003_rls_and_storage.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Database connection URL
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('📦 Installing pg library...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install pg', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Failed to install pg library');
    process.exit(1);
  }

  console.log('\n🔌 Connecting to database...');
  const { Client } = require('pg');
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL\n');

    console.log('🚀 Executing migration SQL...\n');
    await client.query(sql);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - Created current_user_id() helper function');
    console.log('   - Enabled RLS on 18 tables');
    console.log('   - Created user & profile policies');
    console.log('   - Created product & file policies');
    console.log('   - Created order & entitlement policies');
    console.log('   - Created 3 storage buckets (product-files, product-media, user-avatars)');
    console.log('   - Created storage access policies\n');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error('Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.hint) console.error('Hint:', error.hint);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration().catch(console.error);
