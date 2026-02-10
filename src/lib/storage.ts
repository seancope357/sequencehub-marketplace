/**
 * Storage Module - Supabase Storage Adapter
 * Provides a simple interface for file storage operations
 * Backend: Supabase Storage
 */

import {
  uploadFile as supabaseUploadFile,
  uploadBuffer as supabaseUploadBuffer,
  generateSignedUrl,
  deleteFile as supabaseDeleteFile,
  STORAGE_BUCKETS,
  StorageBucket
} from './supabase/storage';

/**
 * Upload a file to storage
 * Used by: /api/upload/complete route
 */
export async function uploadFile(
  filePath: string | File,
  storageKey: string,
  options: {
    contentType?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<string> {
  // Determine bucket from storage key
  const bucket = determineBucket(storageKey);

  // Read file if it's a path
  let fileData: File | Buffer;
  if (typeof filePath === 'string') {
    const fs = await import('fs/promises');
    fileData = await fs.readFile(filePath);
  } else {
    fileData = filePath;
  }

  const result = await supabaseUploadFile(bucket, storageKey, fileData, {
    contentType: options.contentType,
    metadata: options.metadata ? convertMetadataToStrings(options.metadata) : undefined,
  });

  if (result.error) {
    throw new Error(`Storage upload failed: ${result.error}`);
  }

  return storageKey;
}

/**
 * Upload a buffer to storage
 * Used by: /api/upload/simple route
 */
export async function uploadBuffer(
  buffer: Buffer,
  storageKey: string,
  options: {
    contentType?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<void> {
  // Determine bucket from storage key
  const bucket = determineBucket(storageKey);

  const result = await supabaseUploadBuffer(bucket, storageKey, buffer, {
    contentType: options.contentType,
    metadata: options.metadata ? convertMetadataToStrings(options.metadata) : undefined,
  });

  if (result.error) {
    throw new Error(`Storage upload failed: ${result.error}`);
  }
}

/**
 * Generate a signed download URL
 */
export async function generateDownloadUrl(
  storageKey: string,
  expiresIn: number = 300
): Promise<string> {
  const bucket = determineBucket(storageKey);

  const result = await generateSignedUrl(bucket, storageKey, expiresIn);

  if (result.error || !result.url) {
    throw new Error(`Failed to generate signed URL: ${result.error || 'Unknown error'}`);
  }

  return result.url;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(storageKey: string): Promise<void> {
  const bucket = determineBucket(storageKey);

  const result = await supabaseDeleteFile(bucket, storageKey);

  if (result.error) {
    throw new Error(`Storage deletion failed: ${result.error}`);
  }
}

/**
 * Determine which bucket to use based on storage key prefix
 */
function determineBucket(storageKey: string): StorageBucket {
  if (storageKey.startsWith('avatars/') || storageKey.startsWith('user-avatars/')) {
    return STORAGE_BUCKETS.USER_AVATARS;
  }

  if (
    storageKey.startsWith('covers/') ||
    storageKey.startsWith('media/') ||
    storageKey.startsWith('previews/')
  ) {
    return STORAGE_BUCKETS.PRODUCT_MEDIA;
  }

  // Default: product files (sequences, source files, etc.)
  return STORAGE_BUCKETS.PRODUCT_FILES;
}

/**
 * Convert metadata values to strings (Supabase requirement)
 */
function convertMetadataToStrings(metadata: Record<string, any>): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (value !== null && value !== undefined) {
      result[key] = String(value);
    }
  }

  return result;
}

/**
 * Get storage backend name (for logging/monitoring)
 */
export function getStorageBackend(): string {
  return 'supabase';
}
