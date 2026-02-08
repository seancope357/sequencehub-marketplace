#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Interactive Supabase Environment Setup Script
 * Automatically configures .env.local with your Supabase credentials
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

// Configuration
const ENV_FILE = path.join(process.cwd(), '.env.local');
const ENV_EXAMPLE = path.join(process.cwd(), '.env.example');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Prompt helper
function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

// Secure password prompt (hide input)
function secureQuestion(query) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    process.stdout.write(query);

    let password = '';
    stdin.on('data', function listener(char) {
      char = char.toString('utf8');

      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', listener);
        process.stdout.write('\n');
        resolve(password);
      } else if (char === '\u0003') {
        // Ctrl+C
        process.exit();
      } else if (char === '\u007f') {
        // Backspace
        password = password.slice(0, -1);
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(query + '*'.repeat(password.length));
      } else {
        password += char;
        process.stdout.write('*');
      }
    });
  });
}

// Main setup function
async function setup() {
  console.clear();
  log.header('🚀 SequenceHUB - Supabase Environment Setup');
  console.log('This script will help you configure your .env.local file with Supabase credentials.\n');

  log.info('You will need the following from Supabase Dashboard:');
  console.log('  1. Project URL (Settings → API)');
  console.log('  2. Anon/Public Key (Settings → API)');
  console.log('  3. Service Role Key (Settings → API → Reveal)');
  console.log('  4. Database Password (from project creation)\n');

  try {
    // Collect credentials
    const credentials = {};

    log.header('📝 Enter Your Supabase Credentials');

    // Supabase URL
    const defaultUrl = 'https://fhrregyvsmwpfkpnkocy.supabase.co';
    const urlInput = await question(
      `${colors.cyan}Supabase Project URL${colors.reset} [${defaultUrl}]: `
    );
    credentials.supabaseUrl = urlInput.trim() || defaultUrl;

    // Validate URL format
    if (!credentials.supabaseUrl.startsWith('https://') || !credentials.supabaseUrl.includes('.supabase.co')) {
      log.error('Invalid Supabase URL format. Should be: https://xxxxx.supabase.co');
      process.exit(1);
    }

    // Anon Key
    credentials.anonKey = await question(
      `${colors.cyan}Supabase Anon/Public Key${colors.reset} (starts with eyJ...): `
    );
    credentials.anonKey = credentials.anonKey.trim();

    if (!credentials.anonKey || !credentials.anonKey.startsWith('eyJ')) {
      log.error('Invalid anon key format. Should start with "eyJ"');
      process.exit(1);
    }

    // Service Role Key
    credentials.serviceRoleKey = await secureQuestion(
      `${colors.cyan}Supabase Service Role Key${colors.reset} (starts with eyJ...): `
    );
    credentials.serviceRoleKey = credentials.serviceRoleKey.trim();

    if (!credentials.serviceRoleKey || !credentials.serviceRoleKey.startsWith('eyJ')) {
      log.error('Invalid service role key format. Should start with "eyJ"');
      process.exit(1);
    }

    // Database Password
    credentials.dbPassword = await secureQuestion(
      `${colors.cyan}Database Password${colors.reset}: `
    );
    credentials.dbPassword = credentials.dbPassword.trim();

    if (!credentials.dbPassword) {
      log.error('Database password is required');
      process.exit(1);
    }

    // Extract project ref from URL
    const projectRef = credentials.supabaseUrl.replace('https://', '').split('.')[0];
    
    // Build DATABASE_URL
    credentials.databaseUrl = `postgresql://postgres:${credentials.dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;

    // Generate DOWNLOAD_SECRET
    credentials.downloadSecret = crypto.randomBytes(32).toString('hex');

    log.header('🔧 Creating .env.local File');

    // Read .env.example as template
    let envContent = '';
    if (fs.existsSync(ENV_EXAMPLE)) {
      envContent = fs.readFileSync(ENV_EXAMPLE, 'utf8');
      log.success('Loaded .env.example template');
    } else {
      log.warning('.env.example not found, creating from scratch');
      envContent = '# SequenceHUB Environment Variables\n\n';
    }

    // Replace Supabase placeholders
    envContent = envContent.replace(
      /NEXT_PUBLIC_SUPABASE_URL=.*/,
      `NEXT_PUBLIC_SUPABASE_URL="${credentials.supabaseUrl}"`
    );
    envContent = envContent.replace(
      /NEXT_PUBLIC_SUPABASE_ANON_KEY=.*/,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY="${credentials.anonKey}"`
    );
    envContent = envContent.replace(
      /SUPABASE_SERVICE_ROLE_KEY=.*/,
      `SUPABASE_SERVICE_ROLE_KEY="${credentials.serviceRoleKey}"`
    );
    envContent = envContent.replace(
      /DATABASE_URL=.*/,
      `DATABASE_URL="${credentials.databaseUrl}"`
    );
    envContent = envContent.replace(
      /DOWNLOAD_SECRET=.*/,
      `DOWNLOAD_SECRET="${credentials.downloadSecret}"`
    );

    // Write .env.local
    fs.writeFileSync(ENV_FILE, envContent);
    log.success('.env.local file created successfully');

    // Display summary
    log.header('✅ Setup Complete!');
    console.log(`${colors.bright}Configured Variables:${colors.reset}`);
    console.log(`  ${colors.green}✓${colors.reset} NEXT_PUBLIC_SUPABASE_URL`);
    console.log(`  ${colors.green}✓${colors.reset} NEXT_PUBLIC_SUPABASE_ANON_KEY`);
    console.log(`  ${colors.green}✓${colors.reset} SUPABASE_SERVICE_ROLE_KEY`);
    console.log(`  ${colors.green}✓${colors.reset} DATABASE_URL`);
    console.log(`  ${colors.green}✓${colors.reset} DOWNLOAD_SECRET (auto-generated)`);

    log.header('📋 Next Steps');
    console.log('1. Verify connection:');
    console.log(`   ${colors.cyan}node scripts/verify-supabase-connection.js${colors.reset}\n`);
    console.log('2. Run database migrations:');
    console.log(`   ${colors.cyan}Follow instructions in SUPABASE_SETUP.md${colors.reset}\n`);
    console.log('3. Start development:');
    console.log(`   ${colors.cyan}npm run dev${colors.reset}\n`);

    log.info(`Your ${colors.bright}.env.local${colors.reset} file has been created!`);
    log.warning(`Keep ${colors.bright}.env.local${colors.reset} secure and never commit it to git!`);

  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run setup
setup();
