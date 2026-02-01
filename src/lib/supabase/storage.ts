/**
 * Supabase Storage Wrapper
 * Replaces R2/Local storage with Supabase Storage
 */

import { createServerClient, createAdminClient } from './client';

// ============================================
// CONFIGURATION
// ============================================

export const STORAGE_BUCKETS = {
  PRODUCT_FILES: 'product-files',
  PRODUCT_MEDIA: 'product-media',
  USER_AVATARS: 'user-avatars'
} as const;

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];

// ============================================
// UPLOAD FUNCTIONS
// ============================================

/**
 * Upload a file to Supabase Storage
 * Replaces: uploadFile() from old storage/index.ts
 */
export async function uploadFile(
  bucket: StorageBucket,
  storageKey: string,
  file: File | Buffer,
  options: {
    contentType?: string;
    metadata?: Record<string, string>;
    upsert?: boolean;
  } = {}
): Promise<{ data: { path: string } | null; error: string | null }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(storageKey, file, {
      contentType: options.contentType,
      upsert: options.upsert || false,
      metadata: options.metadata
    });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: { path: data.path }, error: null };
}

/**
 * Upload a buffer to Supabase Storage
 * Replaces: uploadBuffer() from old storage/index.ts
 */
export async function uploadBuffer(
  bucket: StorageBucket,
  storageKey: string,
  buffer: Buffer,
  options: {
    contentType?: string;
    metadata?: Record<string, string>;
    upsert?: boolean;
  } = {}
): Promise<{ data: { path: string } | null; error: string | null }> {
  return uploadFile(bucket, storageKey, buffer, options);
}

// ============================================
// DOWNLOAD FUNCTIONS
// ============================================

/**
 * Generate a signed URL for downloading a file
 * Replaces: generateDownloadUrl() from old storage/index.ts
 */
export async function generateSignedUrl(
  bucket: StorageBucket,
  storageKey: string,
  expiresIn: number = 300 // 5 minutes (default)
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storageKey, expiresIn);

  if (error) {
    return { url: null, error: error.message };
  }

  return { url: data.signedUrl, error: null };
}

/**
 * Get public URL for a file (for public buckets only)
 */
export function getPublicUrl(
  bucket: StorageBucket,
  storageKey: string
): string {
  const supabase = createAdminClient();

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(storageKey);

  return data.publicUrl;
}

/**
 * Download a file to memory
 */
export async function downloadFile(
  bucket: StorageBucket,
  storageKey: string
): Promise<{ data: Blob | null; error: string | null }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .download(storageKey);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ============================================
// DELETE FUNCTIONS
// ============================================

/**
 * Delete a file from Supabase Storage
 * Replaces: deleteFile() from old storage/index.ts
 */
export async function deleteFile(
  bucket: StorageBucket,
  storageKey: string
): Promise<{ error: string | null }> {
  const supabase = createAdminClient();

  const { error } = await supabase.storage
    .from(bucket)
    .remove([storageKey]);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Delete multiple files from Supabase Storage
 */
export async function deleteFiles(
  bucket: StorageBucket,
  storageKeys: string[]
): Promise<{ error: string | null }> {
  const supabase = createAdminClient();

  const { error } = await supabase.storage
    .from(bucket)
    .remove(storageKeys);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// ============================================
// FILE MANAGEMENT
// ============================================

/**
 * List files in a bucket/folder
 */
export async function listFiles(
  bucket: StorageBucket,
  folder?: string,
  options: {
    limit?: number;
    offset?: number;
    search?: string;
  } = {}
): Promise<{ files: any[] | null; error: string | null }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder || '', {
      limit: options.limit,
      offset: options.offset,
      search: options.search
    });

  if (error) {
    return { files: null, error: error.message };
  }

  return { files: data, error: null };
}

/**
 * Move/rename a file
 */
export async function moveFile(
  bucket: StorageBucket,
  fromPath: string,
  toPath: string
): Promise<{ error: string | null }> {
  const supabase = createAdminClient();

  const { error } = await supabase.storage
    .from(bucket)
    .move(fromPath, toPath);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Copy a file
 */
export async function copyFile(
  bucket: StorageBucket,
  fromPath: string,
  toPath: string
): Promise<{ error: string | null }> {
  const supabase = createAdminClient();

  const { error } = await supabase.storage
    .from(bucket)
    .copy(fromPath, toPath);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate unique storage key for a file
 */
export function generateStorageKey(
  fileType: 'fseq' | 'xsq' | 'xml' | 'media' | 'avatar',
  fileName: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

  return `${fileType}/${timestamp}-${random}-${sanitized}`;
}

/**
 * Get storage backend in use
 * Replaces: getStorageBackend() from old storage/index.ts
 */
export function getStorageBackend(): 'supabase' {
  return 'supabase';
}

/**
 * Validate file type
 */
export function validateFileType(
  fileName: string,
  allowedExtensions: string[]
): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext ? allowedExtensions.includes(`.${ext}`) : false;
}

/**
 * Validate file size
 */
export function validateFileSize(
  fileSize: number,
  maxSize: number
): boolean {
  return fileSize <= maxSize;
}

// ============================================
// CONSTANTS
// ============================================

export const FILE_SIZE_LIMITS = {
  PRODUCT_FILE: 524288000,  // 500MB
  PRODUCT_MEDIA: 10485760,  // 10MB
  USER_AVATAR: 2097152      // 2MB
} as const;

export const ALLOWED_FILE_TYPES = {
  FSEQ: ['.fseq'],
  XSQ: ['.xsq', '.xml'],
  AUDIO: ['.mp3', '.wav', '.ogg'],
  VIDEO: ['.mp4', '.webm', '.mov'],
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
} as const;
