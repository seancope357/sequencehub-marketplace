/**
 * Storage Abstraction Layer
 * Automatically uses R2 in production or local storage in development
 */

import { isR2Configured, uploadToR2, uploadBufferToR2, deleteFromR2, downloadFromR2, generatePresignedDownloadUrl as generateR2DownloadUrl } from './r2';
import { uploadToLocal, uploadBufferToLocal, deleteFromLocal, downloadFromLocal, generateLocalDownloadUrl } from './local';

/**
 * Upload a file to cloud storage (R2 or local)
 */
export async function uploadFile(
  filePath: string,
  storageKey: string,
  options: {
    contentType?: string;
    metadata?: Record<string, string>;
  } = {}
): Promise<string> {
  if (isR2Configured()) {
    return await uploadToR2(filePath, storageKey, options);
  } else {
    return await uploadToLocal(filePath, storageKey);
  }
}

/**
 * Upload a buffer to cloud storage (R2 or local)
 */
export async function uploadBuffer(
  buffer: Buffer,
  storageKey: string,
  options: {
    contentType?: string;
    metadata?: Record<string, string>;
  } = {}
): Promise<string> {
  if (isR2Configured()) {
    return await uploadBufferToR2(buffer, storageKey, options);
  } else {
    return await uploadBufferToLocal(buffer, storageKey);
  }
}

/**
 * Delete a file from cloud storage
 */
export async function deleteFile(storageKey: string): Promise<void> {
  if (isR2Configured()) {
    await deleteFromR2(storageKey);
  } else {
    await deleteFromLocal(storageKey);
  }
}

/**
 * Download a file from cloud storage to local filesystem
 */
export async function downloadFile(
  storageKey: string,
  localPath: string
): Promise<void> {
  if (isR2Configured()) {
    await downloadFromR2(storageKey, localPath);
  } else {
    await downloadFromLocal(storageKey, localPath);
  }
}

/**
 * Generate a signed download URL
 */
export async function generateDownloadUrl(
  storageKey: string,
  expiresIn: number = 300 // 5 minutes
): Promise<string> {
  if (isR2Configured()) {
    return await generateR2DownloadUrl(storageKey, expiresIn);
  } else {
    return generateLocalDownloadUrl(storageKey, expiresIn);
  }
}

/**
 * Check which storage backend is in use
 */
export function getStorageBackend(): 'r2' | 'local' {
  return isR2Configured() ? 'r2' : 'local';
}
