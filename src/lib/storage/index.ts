/**
 * Storage Abstraction Layer - Supabase Storage Edition
 * Routes all file operations to Supabase Storage
 *
 * This layer provides backward compatibility with the existing upload system
 * while using Supabase Storage as the backend.
 */

import {
  uploadFile as uploadToSupabase,
  uploadBuffer as uploadBufferToSupabase,
  generateSignedUrl as generateSupabaseSignedUrl,
  deleteFile as deleteFromSupabase,
  downloadFile as downloadFromSupabase,
  STORAGE_BUCKETS,
  type StorageBucket
} from '@/lib/supabase/storage';

/**
 * File type mapping to storage buckets
 * Determines which Supabase bucket to use based on file type
 */
type FileType = 'RENDERED' | 'SOURCE' | 'ASSET' | 'PREVIEW' | 'MEDIA' | 'AVATAR';

function getBucketForFileType(fileType?: FileType): StorageBucket {
  switch (fileType) {
    case 'RENDERED':
    case 'SOURCE':
    case 'ASSET':
      return STORAGE_BUCKETS.PRODUCT_FILES;
    case 'PREVIEW':
    case 'MEDIA':
      return STORAGE_BUCKETS.PRODUCT_MEDIA;
    case 'AVATAR':
      return STORAGE_BUCKETS.USER_AVATARS;
    default:
      // Default to product files for backward compatibility
      return STORAGE_BUCKETS.PRODUCT_FILES;
  }
}

/**
 * Upload a file to Supabase Storage
 *
 * @param filePath - Path to file on local filesystem (or File object)
 * @param storageKey - Unique key for the file in storage
 * @param options - Upload options including contentType, metadata, fileType
 * @returns Storage key on success
 * @throws Error on failure
 */
export async function uploadFile(
  filePath: string | File,
  storageKey: string,
  options: {
    contentType?: string;
    metadata?: Record<string, string>;
    fileType?: FileType;
  } = {}
): Promise<string> {
  // Determine which bucket to use based on file type
  const bucket = getBucketForFileType(options.fileType);

  // Read file if it's a path (for Node.js environments)
  let fileData: File | Buffer;

  if (typeof filePath === 'string') {
    // If it's a file path, we need to read it
    // In production with Vercel, this would be a temp file
    const fs = await import('fs/promises');
    fileData = await fs.readFile(filePath);
  } else {
    // If it's already a File object, use it directly
    fileData = filePath;
  }

  // Upload to Supabase
  const { data, error } = await uploadToSupabase(
    bucket,
    storageKey,
    fileData,
    {
      contentType: options.contentType,
      metadata: options.metadata,
      upsert: false // Don't overwrite existing files
    }
  );

  if (error) {
    throw new Error(`Failed to upload file to Supabase: ${error}`);
  }

  if (!data) {
    throw new Error('Upload succeeded but no data returned');
  }

  console.log(`[Storage] File uploaded to ${bucket}/${storageKey}`);
  return storageKey;
}

/**
 * Upload a buffer to Supabase Storage
 *
 * @param buffer - File data as Buffer
 * @param storageKey - Unique key for the file in storage
 * @param options - Upload options
 * @returns Storage key on success
 */
export async function uploadBuffer(
  buffer: Buffer,
  storageKey: string,
  options: {
    contentType?: string;
    metadata?: Record<string, string>;
    fileType?: FileType;
  } = {}
): Promise<string> {
  const bucket = getBucketForFileType(options.fileType);

  const { data, error } = await uploadBufferToSupabase(
    bucket,
    storageKey,
    buffer,
    {
      contentType: options.contentType,
      metadata: options.metadata,
      upsert: false
    }
  );

  if (error) {
    throw new Error(`Failed to upload buffer to Supabase: ${error}`);
  }

  if (!data) {
    throw new Error('Upload succeeded but no data returned');
  }

  console.log(`[Storage] Buffer uploaded to ${bucket}/${storageKey}`);
  return storageKey;
}

/**
 * Delete a file from Supabase Storage
 *
 * @param storageKey - Key of file to delete
 * @param fileType - Type of file (determines bucket)
 */
export async function deleteFile(storageKey: string, fileType?: FileType): Promise<void> {
  const bucket = getBucketForFileType(fileType);

  const { error } = await deleteFromSupabase(bucket, storageKey);

  if (error) {
    throw new Error(`Failed to delete file from Supabase: ${error}`);
  }

  console.log(`[Storage] File deleted from ${bucket}/${storageKey}`);
}

/**
 * Generate a download URL for a file
 * For private files, this creates a signed URL that expires
 * For public files, this returns the public URL
 *
 * @param storageKey - Key of file to download
 * @param expiresIn - URL expiration time in seconds (default: 300 = 5 minutes)
 * @param fileType - Type of file (determines bucket)
 * @returns Download URL
 */
export async function generateDownloadUrl(
  storageKey: string,
  expiresIn: number = 300,
  fileType?: FileType
): Promise<string> {
  const bucket = getBucketForFileType(fileType);

  // Generate signed URL (works for both public and private buckets)
  const { url, error } = await generateSupabaseSignedUrl(bucket, storageKey, expiresIn);

  if (error || !url) {
    throw new Error(`Failed to generate download URL: ${error || 'No URL returned'}`);
  }

  console.log(`[Storage] Generated download URL for ${bucket}/${storageKey} (expires in ${expiresIn}s)`);
  return url;
}

/**
 * Download a file from Supabase Storage
 * Returns the file as a Buffer
 *
 * @param storageKey - Key of file to download
 * @param fileType - Type of file (determines bucket)
 * @returns File data as Buffer
 */
export async function downloadFile(storageKey: string, fileType?: FileType): Promise<Buffer> {
  const bucket = getBucketForFileType(fileType);

  const { data, error } = await downloadFromSupabase(bucket, storageKey);

  if (error || !data) {
    throw new Error(`Failed to download file: ${error || 'No data returned'}`);
  }

  // Convert Blob to Buffer
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Check if Supabase Storage is configured
 * @returns true if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
 */
export function isStorageConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Get the storage bucket for a given file type
 * Useful for debugging or logging
 */
export function getStorageBucket(fileType?: FileType): StorageBucket {
  return getBucketForFileType(fileType);
}

// Export bucket constants for external use
export { STORAGE_BUCKETS };
export type { StorageBucket, FileType };
