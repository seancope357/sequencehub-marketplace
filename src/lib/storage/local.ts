/**
 * Local Filesystem Storage
 * Fallback storage for development when R2 is not configured
 */

import fs from 'fs/promises';
import path from 'path';
import { generateDownloadSignature } from '../upload/hash';

const DOWNLOAD_DIR = path.join(process.cwd(), 'download');
const DOWNLOAD_SECRET = process.env.DOWNLOAD_SECRET || 'change-this-secret-in-production';

/**
 * Ensure download directory exists
 */
async function ensureDownloadDir() {
  try {
    await fs.access(DOWNLOAD_DIR);
  } catch {
    await fs.mkdir(DOWNLOAD_DIR, { recursive: true });
  }
}

/**
 * Upload file to local storage
 */
export async function uploadToLocal(
  filePath: string,
  storageKey: string
): Promise<string> {
  await ensureDownloadDir();

  const destPath = path.join(DOWNLOAD_DIR, storageKey);
  const destDir = path.dirname(destPath);

  // Ensure destination directory exists
  await fs.mkdir(destDir, { recursive: true });

  // Copy file
  await fs.copyFile(filePath, destPath);

  return storageKey;
}

/**
 * Upload buffer to local storage
 */
export async function uploadBufferToLocal(
  buffer: Buffer,
  storageKey: string
): Promise<string> {
  await ensureDownloadDir();

  const destPath = path.join(DOWNLOAD_DIR, storageKey);
  const destDir = path.dirname(destPath);

  // Ensure destination directory exists
  await fs.mkdir(destDir, { recursive: true });

  // Write buffer to file
  await fs.writeFile(destPath, buffer);

  return storageKey;
}

/**
 * Generate signed download URL for local storage
 */
export function generateLocalDownloadUrl(
  storageKey: string,
  expiresIn: number = 300 // 5 minutes
): string {
  const expiresAt = Date.now() + expiresIn * 1000;
  const data = `${storageKey}:${expiresAt}`;
  const signature = generateDownloadSignature(data, DOWNLOAD_SECRET);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/api/media/${encodeURIComponent(storageKey)}?expires=${expiresAt}&signature=${signature}`;
}

/**
 * Get local file path
 */
export function getLocalFilePath(storageKey: string): string {
  return path.join(DOWNLOAD_DIR, storageKey);
}

/**
 * Delete file from local storage
 */
export async function deleteFromLocal(storageKey: string): Promise<void> {
  const filePath = path.join(DOWNLOAD_DIR, storageKey);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    // File might not exist, ignore error
    console.warn(`Failed to delete local file: ${storageKey}`, error);
  }
}

/**
 * Download file from local storage to another location
 */
export async function downloadFromLocal(
  storageKey: string,
  localPath: string
): Promise<void> {
  const sourcePath = path.join(DOWNLOAD_DIR, storageKey);
  await fs.copyFile(sourcePath, localPath);
}

/**
 * Check if file exists in local storage
 */
export async function existsInLocal(storageKey: string): Promise<boolean> {
  const filePath = path.join(DOWNLOAD_DIR, storageKey);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
