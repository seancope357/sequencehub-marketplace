#!/usr/bin/env node

/**
 * Supabase Storage Buckets Setup Script
 *
 * This script creates and configures the required storage buckets for SHUB-V1:
 * 1. product-files (private, 500MB limit) - For FSEQ/XSQ sequence files
 * 2. product-media (public, 50MB limit) - For product images and previews
 * 3. user-avatars (public, 5MB limit) - For user profile pictures
 *
 * Usage: node scripts/setup-supabase-storage.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Bucket configurations
const buckets = [
  {
    id: 'product-files',
    name: 'Product Files',
    public: false,
    fileSizeLimit: 500 * 1024 * 1024, // 500MB
    allowedMimeTypes: [
      'application/octet-stream', // FSEQ files
      'application/xml', // XSQ files
      'text/xml',
      'video/mp4', // Preview videos
      'audio/mpeg', // Audio files
      'audio/mp3'
    ]
  },
  {
    id: 'product-media',
    name: 'Product Media',
    public: true,
    fileSizeLimit: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4'
    ]
  },
  {
    id: 'user-avatars',
    name: 'User Avatars',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ]
  }
];

/**
 * Create a storage bucket
 */
async function createBucket(config) {
  console.log(`\n📦 Creating bucket: ${config.name} (${config.id})`);
  console.log(`   Public: ${config.public}`);
  console.log(`   Size limit: ${Math.round(config.fileSizeLimit / 1024 / 1024)}MB`);

  try {
    // Check if bucket already exists
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const bucketExists = existingBuckets?.some(b => b.id === config.id);

    if (bucketExists) {
      console.log(`   ℹ️  Bucket already exists, updating configuration...`);

      // Update bucket configuration
      const { data, error } = await supabase.storage.updateBucket(config.id, {
        public: config.public,
        fileSizeLimit: config.fileSizeLimit,
        allowedMimeTypes: config.allowedMimeTypes
      });

      if (error) {
        throw new Error(`Failed to update bucket: ${error.message}`);
      }

      console.log(`   ✅ Bucket updated successfully`);
      return { bucket: config.id, action: 'updated' };
    } else {
      // Create new bucket
      const { data, error } = await supabase.storage.createBucket(config.id, {
        public: config.public,
        fileSizeLimit: config.fileSizeLimit,
        allowedMimeTypes: config.allowedMimeTypes
      });

      if (error) {
        throw new Error(`Failed to create bucket: ${error.message}`);
      }

      console.log(`   ✅ Bucket created successfully`);
      return { bucket: config.id, action: 'created' };
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { bucket: config.id, action: 'failed', error: error.message };
  }
}

/**
 * Set up RLS policies for buckets
 */
async function setupPolicies() {
  console.log('\n🔒 Setting up RLS policies...');
  console.log('   Note: RLS policies should be configured in Supabase Dashboard → Storage → Policies');
  console.log('');
  console.log('   Required policies:');
  console.log('');
  console.log('   📁 product-files (private):');
  console.log('      - Creators can upload to their own products');
  console.log('      - Buyers can download files they purchased');
  console.log('      - Admins can access all files');
  console.log('');
  console.log('   📁 product-media (public):');
  console.log('      - Creators can upload/update/delete their product media');
  console.log('      - Anyone can view (public bucket)');
  console.log('');
  console.log('   📁 user-avatars (public):');
  console.log('      - Users can upload/update/delete their own avatar');
  console.log('      - Anyone can view (public bucket)');
  console.log('');
  console.log('   ℹ️  Detailed policy SQL can be found in: supabase/migrations/');
}

/**
 * Test bucket access
 */
async function testBuckets() {
  console.log('\n🧪 Testing bucket access...');

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      throw new Error(`Failed to list buckets: ${error.message}`);
    }

    console.log(`   ✅ Successfully connected to Supabase Storage`);
    console.log(`   📦 Total buckets: ${buckets.length}`);

    buckets.forEach(bucket => {
      const ourBucket = buckets.find(b => b.id === bucket.id);
      if (['product-files', 'product-media', 'user-avatars'].includes(bucket.id)) {
        console.log(`      ✓ ${bucket.id} - ${bucket.public ? 'Public' : 'Private'}`);
      }
    });

    return { success: true };
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('=================================================');
  console.log('  SHUB-V1 Supabase Storage Setup');
  console.log('=================================================');
  console.log(`\n🔗 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Service Key: ${supabaseServiceKey.substring(0, 20)}...`);

  const results = [];

  // Create all buckets
  for (const bucket of buckets) {
    const result = await createBucket(bucket);
    results.push(result);
  }

  // Set up policies info
  await setupPolicies();

  // Test bucket access
  await testBuckets();

  // Summary
  console.log('\n=================================================');
  console.log('  Setup Summary');
  console.log('=================================================');

  const created = results.filter(r => r.action === 'created').length;
  const updated = results.filter(r => r.action === 'updated').length;
  const failed = results.filter(r => r.action === 'failed').length;

  console.log(`\n✅ Created: ${created} buckets`);
  console.log(`🔄 Updated: ${updated} buckets`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed} buckets`);
  }

  console.log('\n📋 Next Steps:');
  console.log('   1. Verify buckets in Supabase Dashboard → Storage');
  console.log('   2. Configure RLS policies if needed (see documentation)');
  console.log('   3. Test file uploads from your application');
  console.log('');
  console.log('🎉 Storage setup complete!');
  console.log('=================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
