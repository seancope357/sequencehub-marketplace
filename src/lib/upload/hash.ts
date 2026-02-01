/**
 * File Hashing Utilities
 * SHA-256 and MD5 hashing for file integrity and deduplication
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import { createReadStream } from 'fs';

/**
 * Calculate SHA-256 hash of a file
 * Used for deduplication and integrity verification
 */
export async function calculateFileSHA256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (error) => reject(error));
  });
}

/**
 * Calculate SHA-256 hash of a buffer
 */
export function calculateBufferSHA256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Calculate MD5 hash of a buffer (for chunk verification)
 */
export function calculateBufferMD5(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Calculate MD5 hash of a file
 */
export async function calculateFileMD5(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (error) => reject(error));
  });
}

/**
 * Generate a unique upload ID
 */
export function generateUploadId(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(16).toString('hex');
  return `upload_${timestamp}_${random}`;
}

/**
 * Generate a secure storage key for cloud storage
 */
export function generateStorageKey(fileName: string, fileType: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const ext = fileName.split('.').pop();
  const sanitized = fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 100); // Limit length

  return `${fileType.toLowerCase()}/${timestamp}-${random}-${sanitized}`;
}

/**
 * Generate HMAC signature for download URLs
 */
export function generateDownloadSignature(
  data: string,
  secret: string
): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature for download URLs
 */
export function verifyDownloadSignature(
  data: string,
  signature: string,
  secret: string
): boolean {
  const expected = generateDownloadSignature(data, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
