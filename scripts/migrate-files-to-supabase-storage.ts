#!/usr/bin/env bun

/**
 * SequenceHUB File Storage Migration Script
 *
 * Migrates files from R2/Local storage to Supabase Storage
 *
 * Usage:
 *   bun run scripts/migrate-files-to-supabase-storage.ts
 *
 * Prerequisites:
 *   - Data migration completed (users, products, files metadata in Supabase)
 *   - Supabase Storage buckets created
 *   - Storage policies applied
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// ============================================
// CONFIGURATION
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const db = new PrismaClient();

// R2 Client (if migrating from R2)
const r2Client = process.env.R2_ENDPOINT ? new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
  }
}) : null;

// Local storage path (if migrating from local)
const LOCAL_STORAGE_PATH = path.join(process.cwd(), 'download');

// Migration statistics
const stats = {
  productFiles: 0,
  productMedia: 0,
  userAvatars: 0,
  bytes: 0,
  errors: 0,
  skipped: 0
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate SHA-256 hash of file
 */
async function calculateFileHash(buffer: Buffer): Promise<string> {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Download file from R2
 */
async function downloadFromR2(storageKey: string): Promise<Buffer> {
  if (!r2Client) {
    throw new Error('R2 client not configured');
  }

  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: storageKey
  });

  const response = await r2Client.send(command);

  if (!response.Body) {
    throw new Error('No file body returned from R2');
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

/**
 * Download file from local storage
 */
async function downloadFromLocal(storageKey: string): Promise<Buffer> {
  const filePath = path.join(LOCAL_STORAGE_PATH, storageKey);
  return await fs.readFile(filePath);
}

/**
 * Download file from current storage
 */
async function downloadFile(storageKey: string): Promise<Buffer> {
  try {
    // Try R2 first if configured
    if (r2Client) {
      return await downloadFromR2(storageKey);
    } else {
      return await downloadFromLocal(storageKey);
    }
  } catch (error) {
    throw new Error(`Failed to download ${storageKey}: ${error}`);
  }
}

/**
 * Upload file to Supabase Storage
 */
async function uploadToSupabase(
  bucket: string,
  storageKey: string,
  buffer: Buffer,
  contentType: string
): Promise<boolean> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(storageKey, buffer, {
      contentType,
      upsert: true
    });

  if (error) {
    console.error(`❌ Upload error for ${storageKey}:`, error);
    return false;
  }

  return true;
}

/**
 * Log progress
 */
function logProgress(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// ============================================
// MIGRATION FUNCTIONS
// ============================================

/**
 * Migrate Product Files
 */
async function migrateProductFiles() {
  logProgress('📦 Migrating product files...');

  const files = await supabase
    .from('product_files')
    .select('*')
    .order('created_at', { ascending: true });

  if (files.error) {
    console.error('Failed to fetch product files:', files.error);
    return;
  }

  const totalFiles = files.data?.length || 0;
  let processed = 0;

  for (const file of files.data || []) {
    processed++;

    try {
      logProgress(`[${processed}/${totalFiles}] Processing: ${file.file_name}`);

      // Check if already exists in Supabase Storage
      const { data: existing } = await supabase.storage
        .from('product-files')
        .list(path.dirname(file.storage_key), {
          search: path.basename(file.storage_key)
        });

      if (existing && existing.length > 0) {
        logProgress(`⏭️  Skipping ${file.file_name} (already exists)`);
        stats.skipped++;
        continue;
      }

      // Download from old storage
      const buffer = await downloadFile(file.storage_key);

      // Verify hash
      const hash = await calculateFileHash(buffer);
      if (hash !== file.file_hash) {
        console.error(`❌ Hash mismatch for ${file.file_name}! Expected: ${file.file_hash}, Got: ${hash}`);
        stats.errors++;
        continue;
      }

      // Upload to Supabase Storage
      const uploaded = await uploadToSupabase(
        'product-files',
        file.storage_key,
        buffer,
        file.mime_type || 'application/octet-stream'
      );

      if (uploaded) {
        stats.productFiles++;
        stats.bytes += buffer.length;
        logProgress(`✅ Migrated: ${file.file_name} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
      } else {
        stats.errors++;
      }

    } catch (error) {
      console.error(`❌ Error migrating ${file.file_name}:`, error);
      stats.errors++;
    }
  }

  logProgress(`✅ Migrated ${stats.productFiles} product files`);
}

/**
 * Migrate Product Media
 */
async function migrateProductMedia() {
  logProgress('🖼️  Migrating product media...');

  const media = await supabase
    .from('product_media')
    .select('*')
    .order('created_at', { ascending: true });

  if (media.error) {
    console.error('Failed to fetch product media:', media.error);
    return;
  }

  const totalMedia = media.data?.length || 0;
  let processed = 0;

  for (const item of media.data || []) {
    processed++;

    try {
      logProgress(`[${processed}/${totalMedia}] Processing: ${item.file_name}`);

      // Check if already exists
      const { data: existing } = await supabase.storage
        .from('product-media')
        .list(path.dirname(item.storage_key), {
          search: path.basename(item.storage_key)
        });

      if (existing && existing.length > 0) {
        logProgress(`⏭️  Skipping ${item.file_name} (already exists)`);
        stats.skipped++;
        continue;
      }

      // Download from old storage
      const buffer = await downloadFile(item.storage_key);

      // Verify hash
      const hash = await calculateFileHash(buffer);
      if (hash !== item.file_hash) {
        console.error(`❌ Hash mismatch for ${item.file_name}!`);
        stats.errors++;
        continue;
      }

      // Upload to Supabase Storage
      const uploaded = await uploadToSupabase(
        'product-media',
        item.storage_key,
        buffer,
        item.mime_type || 'image/jpeg'
      );

      if (uploaded) {
        stats.productMedia++;
        stats.bytes += buffer.length;
        logProgress(`✅ Migrated: ${item.file_name} (${(buffer.length / 1024).toFixed(2)} KB)`);
      } else {
        stats.errors++;
      }

    } catch (error) {
      console.error(`❌ Error migrating ${item.file_name}:`, error);
      stats.errors++;
    }
  }

  logProgress(`✅ Migrated ${stats.productMedia} product media files`);
}

/**
 * Migrate User Avatars
 */
async function migrateUserAvatars() {
  logProgress('👤 Migrating user avatars...');

  const users = await supabase
    .from('users')
    .select('id, avatar')
    .not('avatar', 'is', null);

  if (users.error) {
    console.error('Failed to fetch users:', users.error);
    return;
  }

  const totalUsers = users.data?.length || 0;
  let processed = 0;

  for (const user of users.data || []) {
    processed++;

    if (!user.avatar) continue;

    try {
      logProgress(`[${processed}/${totalUsers}] Processing avatar for user: ${user.id}`);

      // Extract storage key from avatar URL if it's a full URL
      let storageKey = user.avatar;
      if (user.avatar.startsWith('http')) {
        // Parse URL to get storage key
        const url = new URL(user.avatar);
        storageKey = url.pathname.replace('/api/media/', '');
      }

      // Check if already exists
      const newStorageKey = `${user.id}/avatar.jpg`;
      const { data: existing } = await supabase.storage
        .from('user-avatars')
        .list(user.id, {
          search: 'avatar.jpg'
        });

      if (existing && existing.length > 0) {
        logProgress(`⏭️  Skipping avatar for ${user.id} (already exists)`);
        stats.skipped++;
        continue;
      }

      // Download from old storage
      const buffer = await downloadFile(storageKey);

      // Upload to Supabase Storage
      const uploaded = await uploadToSupabase(
        'user-avatars',
        newStorageKey,
        buffer,
        'image/jpeg'
      );

      if (uploaded) {
        // Update user avatar URL in database
        const { data: publicUrl } = supabase.storage
          .from('user-avatars')
          .getPublicUrl(newStorageKey);

        await supabase
          .from('users')
          .update({ avatar: publicUrl.publicUrl })
          .eq('id', user.id);

        stats.userAvatars++;
        stats.bytes += buffer.length;
        logProgress(`✅ Migrated avatar for user: ${user.id}`);
      } else {
        stats.errors++;
      }

    } catch (error) {
      console.error(`❌ Error migrating avatar for ${user.id}:`, error);
      stats.errors++;
    }
  }

  logProgress(`✅ Migrated ${stats.userAvatars} user avatars`);
}

// ============================================
// MAIN MIGRATION FLOW
// ============================================

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   SequenceHUB File Storage Migration                     ║');
  console.log('║   R2/Local → Supabase Storage                            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  const startTime = Date.now();

  try {
    // Migrate product files
    await migrateProductFiles();

    // Migrate product media
    await migrateProductMedia();

    // Migrate user avatars
    await migrateUserAvatars();

    // Final statistics
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    const totalMB = (stats.bytes / 1024 / 1024).toFixed(2);

    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║   Migration Complete!                                     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📊 Migration Statistics:');
    console.log('┌─────────────────────────┬─────────┐');
    console.log('│ Product Files           │', stats.productFiles.toString().padStart(7), '│');
    console.log('│ Product Media           │', stats.productMedia.toString().padStart(7), '│');
    console.log('│ User Avatars            │', stats.userAvatars.toString().padStart(7), '│');
    console.log('│ Skipped (exists)        │', stats.skipped.toString().padStart(7), '│');
    console.log('├─────────────────────────┼─────────┤');
    console.log('│ Total Migrated (MB)     │', totalMB.padStart(7), '│');
    console.log('│ Errors                  │', stats.errors.toString().padStart(7), '│');
    console.log('│ Duration (minutes)      │', duration.padStart(7), '│');
    console.log('└─────────────────────────┴─────────┘');
    console.log('');

    if (stats.errors > 0) {
      console.log('⚠️  Migration completed with errors. Review logs above.');
      console.log('');
      console.log('Next steps:');
      console.log('1. Review error logs and retry failed files');
      console.log('2. Verify files in Supabase Storage dashboard');
      console.log('3. Test file downloads through application');
      console.log('');
      process.exit(1);
    } else {
      console.log('✅ File migration completed successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Verify files in Supabase Storage dashboard');
      console.log('2. Test file downloads through application');
      console.log('3. Keep R2/local storage for 30 days as backup');
      console.log('4. After verification, delete old storage files');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run migration
main();
