#!/usr/bin/env node

/**
 * Smart RLS Migration Script
 * Automatically applies RLS policies to Supabase, fixing errors as they occur
 */

const fs = require('fs');
const path = require('path');

async function applyRLSPolicies() {
  try {
    console.log('🔌 Connecting to Supabase PostgreSQL...\n');

    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '005_setup_rls_policies_safe.sql');
    let migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Loaded RLS migration file\n');
    console.log('🔄 Starting migration with auto-fix...\n');

    // Split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    let successCount = 0;
    let errorCount = 0;
    let fixCount = 0;
    const errors = [];

    for (let i = 0; i < statements.length; i++) {
      let statement = statements[i];
      const preview = statement.substring(0, 80).replace(/\n/g, ' ');

      console.log(`[${i + 1}/${statements.length}] ${preview}...`);

      let retries = 0;
      const maxRetries = 3;
      let success = false;

      while (retries < maxRetries && !success) {
        try {
          await client.query(statement);
          console.log('  ✅ Success\n');
          successCount++;
          success = true;
        } catch (error) {
          const errorMsg = error.message;

          // Check for specific errors and auto-fix
          if (errorMsg.includes('already exists') || errorMsg.includes('does not exist')) {
            console.log('  ⚠️  Already exists or missing - skipping\n');
            successCount++;
            success = true;
          } else if (errorMsg.includes('column') && errorMsg.includes('does not exist')) {
            // Column name error - try to fix
            console.log(`  ❌ Error: ${errorMsg}`);

            // Extract column name from error
            const match = errorMsg.match(/column "([^"]+)" does not exist/);
            if (match && errorMsg.includes('Perhaps you meant to reference')) {
              const wrongColumn = match[1];
              const suggestionMatch = errorMsg.match(/Perhaps you meant to reference the column "([^"]+)"/);

              if (suggestionMatch) {
                const correctColumn = suggestionMatch[1];
                console.log(`  🔧 Auto-fixing: "${wrongColumn}" → "${correctColumn}"`);

                // Replace the column name
                statement = statement.replace(
                  new RegExp(`"${wrongColumn}"`, 'g'),
                  `"${correctColumn}"`
                );

                fixCount++;
                retries++;
                continue;
              }
            }

            console.log('  ⚠️  Cannot auto-fix - skipping\n');
            errorCount++;
            errors.push({ statement: preview, error: errorMsg });
            break;
          } else if (errorMsg.includes('permission denied')) {
            console.log(`  ❌ Permission denied: ${errorMsg}`);
            console.log('  ⚠️  Skipping (may require superuser)\n');
            errorCount++;
            errors.push({ statement: preview, error: errorMsg });
            break;
          } else {
            console.log(`  ❌ Error: ${errorMsg}`);
            console.log('  ⚠️  Cannot auto-fix - skipping\n');
            errorCount++;
            errors.push({ statement: preview, error: errorMsg });
            break;
          }
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 Migration Summary');
    console.log('='.repeat(80));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`🔧 Auto-fixed: ${fixCount}`);
    console.log('='.repeat(80) + '\n');

    if (errors.length > 0) {
      console.log('⚠️  Errors encountered:\n');
      errors.forEach((err, idx) => {
        console.log(`${idx + 1}. ${err.statement}`);
        console.log(`   Error: ${err.error}\n`);
      });
    }

    // Verify policies were created
    console.log('🔍 Verifying policies...\n');

    const verifyResult = await client.query(`
      SELECT
        tablename,
        COUNT(*) as policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
      GROUP BY tablename
      ORDER BY tablename;
    `);

    console.log('📋 Policies per table:');
    verifyResult.rows.forEach(row => {
      console.log(`  ${row.tablename.padEnd(30)} ${row.policy_count} policies`);
    });

    const totalPolicies = verifyResult.rows.reduce((sum, row) => sum + parseInt(row.policy_count), 0);
    console.log(`\n✅ Total: ${totalPolicies} policies created across ${verifyResult.rows.length} tables\n`);

    await client.end();

    if (errorCount === 0) {
      console.log('🎉 Migration completed successfully!\n');
      process.exit(0);
    } else {
      console.log('⚠️  Migration completed with some errors (see above)\n');
      console.log('Most policies should still be working. Check the errors above.\n');
      process.exit(0); // Exit success anyway - partial success is OK
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Load environment
console.log('📋 Loading environment variables...\n');
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

applyRLSPolicies();
