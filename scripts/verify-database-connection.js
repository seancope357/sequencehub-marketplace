#!/usr/bin/env node

/**
 * Verify Database Connection
 * Tests both direct and pooler connections to Supabase
 */

const path = require('path');

async function verifyConnection() {
  try {
    console.log('🔍 Database Connection Verification\n');
    console.log('='.repeat(80) + '\n');

    // Load environment
    const dotenv = require('dotenv');
    dotenv.config({ path: path.join(__dirname, '..', '.env') });

    const { Client } = require('pg');

    // Parse DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('❌ DATABASE_URL not found in .env');
      process.exit(1);
    }

    console.log('📋 Current DATABASE_URL Configuration:\n');

    // Extract parts
    const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)(\?.*)?/);
    if (urlMatch) {
      const [, user, pass, host, port, database, params] = urlMatch;
      console.log(`  Host:     ${host}`);
      console.log(`  Port:     ${port} ${port === '6543' ? '✅ (POOLER - CORRECT)' : '⚠️  (DIRECT - NOT RECOMMENDED FOR VERCEL)'}`);
      console.log(`  Database: ${database}`);
      console.log(`  User:     ${user}`);
      console.log(`  Password: ${'*'.repeat(pass.length)}`);
      console.log(`  Params:   ${params || 'none'} ${params && params.includes('pgbouncer=true') ? '✅ (Transaction mode enabled)' : '⚠️  (Missing pgbouncer=true)'}`);
      console.log();
    }

    // Test 1: Connection Pooler (Port 6543)
    console.log('━'.repeat(80));
    console.log('TEST 1: Connection Pooler (Port 6543) - RECOMMENDED FOR VERCEL');
    console.log('━'.repeat(80) + '\n');

    const poolerUrl = dbUrl.replace(':5432', ':6543').replace('?pgbouncer=true', '').concat(dbUrl.includes('?') ? '' : '?pgbouncer=true');

    try {
      const poolerClient = new Client({ connectionString: poolerUrl });
      console.log('🔌 Connecting to pooler...');
      await poolerClient.connect();
      console.log('✅ Connected successfully!\n');

      // Test query
      console.log('📝 Testing query: SELECT version()');
      const versionResult = await poolerClient.query('SELECT version()');
      console.log('✅ Query successful!');
      console.log(`   PostgreSQL: ${versionResult.rows[0].version.split(' ')[1]}\n`);

      // Test user query
      console.log('📝 Testing query: SELECT COUNT(*) FROM "User"');
      const userCount = await poolerClient.query('SELECT COUNT(*) FROM "User"');
      console.log(`✅ Query successful!`);
      console.log(`   Users in database: ${userCount.rows[0].count}\n`);

      await poolerClient.end();
      console.log('✅ Pooler connection TEST PASSED\n');
    } catch (error) {
      console.error('❌ Pooler connection FAILED:');
      console.error(`   ${error.message}\n`);
    }

    // Test 2: Direct Connection (Port 5432) - For comparison
    console.log('━'.repeat(80));
    console.log('TEST 2: Direct Connection (Port 5432) - LOCAL DEV ONLY');
    console.log('━'.repeat(80) + '\n');

    const directUrl = dbUrl.replace(':6543', ':5432').replace('?pgbouncer=true', '');

    try {
      const directClient = new Client({ connectionString: directUrl });
      console.log('🔌 Connecting directly...');
      await directClient.connect();
      console.log('✅ Connected successfully!\n');

      // Test query
      console.log('📝 Testing query: SELECT COUNT(*) FROM "User"');
      const userCount = await directClient.query('SELECT COUNT(*) FROM "User"');
      console.log(`✅ Query successful!`);
      console.log(`   Users in database: ${userCount.rows[0].count}\n`);

      await directClient.end();
      console.log('✅ Direct connection TEST PASSED\n');
      console.log('⚠️  Note: Direct connection works but NOT recommended for Vercel\n');
    } catch (error) {
      console.error('❌ Direct connection FAILED:');
      console.error(`   ${error.message}\n`);
    }

    // Test 3: Prisma Connection
    console.log('━'.repeat(80));
    console.log('TEST 3: Prisma ORM Connection');
    console.log('━'.repeat(80) + '\n');

    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: poolerUrl
          }
        }
      });

      console.log('🔌 Connecting via Prisma...');
      await prisma.$connect();
      console.log('✅ Connected successfully!\n');

      console.log('📝 Testing Prisma query: prisma.user.count()');
      const count = await prisma.user.count();
      console.log(`✅ Query successful!`);
      console.log(`   Users in database: ${count}\n`);

      // Test finding a specific user
      console.log('📝 Testing Prisma query: prisma.user.findFirst()');
      const user = await prisma.user.findFirst({
        select: { email: true, name: true, createdAt: true }
      });
      if (user) {
        console.log(`✅ Query successful!`);
        console.log(`   Found user: ${user.email}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Created: ${user.createdAt}\n`);
      } else {
        console.log('⚠️  No users found in database\n');
      }

      await prisma.$disconnect();
      console.log('✅ Prisma connection TEST PASSED\n');
    } catch (error) {
      console.error('❌ Prisma connection FAILED:');
      console.error(`   ${error.message}\n`);
    }

    // Summary
    console.log('━'.repeat(80));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('━'.repeat(80) + '\n');

    const currentPort = dbUrl.includes(':6543') ? '6543' : '5432';
    const hasPgBouncer = dbUrl.includes('pgbouncer=true');

    console.log('Current Configuration:');
    console.log(`  Port: ${currentPort} ${currentPort === '6543' ? '✅' : '❌'}`);
    console.log(`  pgbouncer=true: ${hasPgBouncer ? '✅' : '❌'}\n`);

    if (currentPort === '6543' && hasPgBouncer) {
      console.log('✅ ✅ ✅ CONFIGURATION IS CORRECT FOR VERCEL! ✅ ✅ ✅\n');
      console.log('Your DATABASE_URL is properly configured for serverless deployment.\n');
      console.log('Next steps:');
      console.log('1. Make sure this EXACT URL is in Vercel environment variables');
      console.log('2. Redeploy from Vercel dashboard (uncheck "use cache")');
      console.log('3. Try logging in - should work now!\n');
    } else {
      console.log('⚠️  ⚠️  ⚠️  CONFIGURATION NEEDS TO BE UPDATED ⚠️  ⚠️  ⚠️\n');
      console.log('Your DATABASE_URL needs these changes:');
      if (currentPort !== '6543') {
        console.log('  - Change port from 5432 to 6543');
      }
      if (!hasPgBouncer) {
        console.log('  - Add ?pgbouncer=true to the end');
      }
      console.log('\nCorrect format:');
      console.log('postgresql://postgres:PASSWORD@db.fhrregyvsmwpfkpnkocy.supabase.co:6543/postgres?pgbouncer=true\n');
    }

    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

verifyConnection();
