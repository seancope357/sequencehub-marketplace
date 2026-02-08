#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Supabase Connection Verification Script
 * Tests database connection and Supabase client initialization
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

// Load environment variables
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    log.error('.env.local file not found!');
    log.info('Run: node scripts/setup-supabase-env.js');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};

  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=["']?([^"']+)["']?$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });

  return env;
}

// Verify environment variables
function verifyEnvVars(env) {
  log.header('🔍 Verifying Environment Variables');

  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
  ];

  let allPresent = true;

  required.forEach(key => {
    if (env[key]) {
      log.success(`${key} is set`);
    } else {
      log.error(`${key} is missing`);
      allPresent = false;
    }
  });

  return allPresent;
}

// Test Supabase URL reachability
async function testSupabaseUrl(url) {
  log.header('🌐 Testing Supabase URL Reachability');

  try {
    const https = require('https');
    
    return new Promise((resolve, reject) => {
      const request = https.get(url, (response) => {
        if (response.statusCode === 200 || response.statusCode === 404) {
          log.success(`Supabase URL is reachable: ${url}`);
          resolve(true);
        } else {
          log.error(`Unexpected status code: ${response.statusCode}`);
          resolve(false);
        }
      });

      request.on('error', (error) => {
        log.error(`Cannot reach Supabase URL: ${error.message}`);
        resolve(false);
      });

      request.setTimeout(5000, () => {
        request.abort();
        log.error('Request timed out');
        resolve(false);
      });
    });
  } catch (error) {
    log.error(`URL test failed: ${error.message}`);
    return false;
  }
}

// Test Supabase client initialization
async function testSupabaseClient(env) {
  log.header('🔑 Testing Supabase Client Initialization');

  try {
    // Try to import Supabase
    let createClient;
    try {
      const supabase = require('@supabase/supabase-js');
      createClient = supabase.createClient;
      log.success('@supabase/supabase-js package is installed');
    } catch (error) {
      log.error('@supabase/supabase-js is not installed');
      log.info('Run: npm install @supabase/supabase-js');
      return false;
    }

    // Create client
    const client = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    log.success('Supabase client initialized successfully');

    // Test auth (just check if the method exists)
    if (client.auth && typeof client.auth.signInWithPassword === 'function') {
      log.success('Auth client is available');
    } else {
      log.warning('Auth client may not be properly initialized');
    }

    return true;
  } catch (error) {
    log.error(`Client initialization failed: ${error.message}`);
    return false;
  }
}

// Test database connection
async function testDatabaseConnection(env) {
  log.header('🗄️  Testing Database Connection');

  try {
    // Try to import Prisma
    let PrismaClient;
    try {
      const prisma = require('@prisma/client');
      PrismaClient = prisma.PrismaClient;
      log.success('@prisma/client package is installed');
    } catch (error) {
      log.warning('@prisma/client is not installed');
      log.info('This is optional - Prisma can be installed later');
      log.info('Run: npm install @prisma/client && npx prisma generate');
      return true; // Not a critical failure
    }

    // Create Prisma client with DATABASE_URL
    process.env.DATABASE_URL = env.DATABASE_URL;
    const prisma = new PrismaClient();

    try {
      // Try to connect
      await prisma.$connect();
      log.success('Database connection established');

      // Try a simple query
      await prisma.$queryRaw`SELECT 1 as test`;
      log.success('Database query test successful');

      await prisma.$disconnect();
      return true;
    } catch (error) {
      log.error(`Database connection failed: ${error.message}`);
      log.info('Make sure you ran the database migrations in Supabase Dashboard');
      log.info('See: SUPABASE_SETUP.md for migration instructions');
      return false;
    }
  } catch (error) {
    log.error(`Database test failed: ${error.message}`);
    return false;
  }
}

// Main verification function
async function verify() {
  console.clear();
  log.header('🔬 SequenceHUB - Supabase Connection Verification');

  try {
    // Load environment
    const env = loadEnv();
    log.success('Loaded .env.local file');

    // Run tests
    const envVarsOk = verifyEnvVars(env);
    if (!envVarsOk) {
      log.error('Environment variables are incomplete');
      log.info('Run: node scripts/setup-supabase-env.js');
      process.exit(1);
    }

    const urlOk = await testSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL);
    const clientOk = await testSupabaseClient(env);
    const dbOk = await testDatabaseConnection(env);

    // Summary
    log.header('📊 Verification Summary');

    const tests = [
      { name: 'Environment Variables', passed: envVarsOk },
      { name: 'Supabase URL Reachable', passed: urlOk },
      { name: 'Supabase Client', passed: clientOk },
      { name: 'Database Connection', passed: dbOk },
    ];

    tests.forEach(test => {
      if (test.passed) {
        log.success(test.name);
      } else {
        log.error(test.name);
      }
    });

    const allPassed = tests.every(t => t.passed);

    if (allPassed) {
      log.header('✅ All Tests Passed!');
      console.log('Your Supabase connection is configured correctly.\n');
      log.info('Next steps:');
      console.log('  1. Run database migrations (see SUPABASE_SETUP.md)');
      console.log('  2. Start development: npm run dev\n');
    } else {
      log.header('⚠️  Some Tests Failed');
      console.log('Please review the errors above and fix any issues.\n');
      log.info('Common solutions:');
      console.log('  • Re-run setup: node scripts/setup-supabase-env.js');
      console.log('  • Check credentials in Supabase Dashboard → Settings → API');
      console.log('  • Ensure database migrations are run');
      console.log('  • Install missing packages: npm install\n');
      process.exit(1);
    }
  } catch (error) {
    log.error(`Verification failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run verification
verify();
