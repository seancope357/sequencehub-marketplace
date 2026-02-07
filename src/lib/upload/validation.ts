/**
 * File Upload Validation
 * Validates file types, sizes, extensions, and magic bytes
 */

import { FileType } from '@prisma/client';
import { createHash } from 'crypto';
import path from 'path';
import { FILE_TYPE_CONFIGS, MAGIC_BYTES, FileValidationResult } from './types';

/**
 * Validate file type, extension, MIME type, and size
 */
export function validateFile(
  fileName: string,
  fileSize: number,
  mimeType: string,
  fileType: FileType
): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const config = FILE_TYPE_CONFIGS[fileType];
  if (!config) {
    errors.push(`Unknown file type: ${fileType}`);
    return { valid: false, errors, warnings };
  }

  // Check extension
  const ext = path.extname(fileName).toLowerCase();
  if (!config.allowedExtensions.includes(ext)) {
    errors.push(
      `Invalid extension for ${fileType}. Expected: ${config.allowedExtensions.join(', ')}. Got: ${ext}`
    );
  }

  // Check MIME type
  if (!config.allowedMimeTypes.includes(mimeType)) {
    warnings.push(
      `Unexpected MIME type for ${fileType}. Expected: ${config.allowedMimeTypes.join(', ')}. Got: ${mimeType}`
    );
  }

  // Check size
  if (fileSize <= 0) {
    errors.push('File size must be greater than 0');
  } else if (fileSize > config.maxFileSize) {
    errors.push(
      `File too large. Max size for ${fileType}: ${formatFileSize(config.maxFileSize)}. Got: ${formatFileSize(fileSize)}`
    );
  }

  // Check for path traversal in filename
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    errors.push('Invalid filename: path traversal detected');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate magic bytes of a file buffer
 */
export function validateMagicBytes(fileBuffer: Buffer, expectedType: string): boolean {
  const magicBytes = MAGIC_BYTES[expectedType];
  if (!magicBytes) {
    // No magic bytes defined for this type, skip validation
    return true;
  }

  if (fileBuffer.length < magicBytes.length) {
    return false;
  }

  return fileBuffer.subarray(0, magicBytes.length).equals(magicBytes);
}

/**
 * Determine expected magic byte type from file extension
 */
export function getExpectedMagicByteType(fileName: string): string | null {
  const ext = path.extname(fileName).toLowerCase();

  switch (ext) {
    case '.fseq':
      return 'FSEQ';
    case '.png':
      return 'PNG';
    case '.jpg':
    case '.jpeg':
      return 'JPEG';
    case '.gif':
      return 'GIF';
    case '.mp4':
      return 'MP4';
    case '.xml':
    case '.xsq':
      return 'XML';
    default:
      return null;
  }
}

/**
 * Validate file extension and magic bytes match
 */
export function validateFileIntegrity(fileBuffer: Buffer, fileName: string): FileValidationResult {
  const errors: string[] = [];
  const expectedType = getExpectedMagicByteType(fileName);

  if (expectedType) {
    const isValid = validateMagicBytes(fileBuffer, expectedType);
    if (!isValid) {
      errors.push(
        `File type mismatch: extension suggests ${expectedType} but magic bytes don't match. Possible file corruption or security threat.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize filename to prevent security issues
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path components
  const baseName = path.basename(fileName);

  // Replace any characters that aren't alphanumeric, dots, hyphens, or underscores
  const sanitized = baseName.replace(/[^a-zA-Z0-9.-_]/g, '_');

  // Ensure it doesn't start with a dot (hidden file)
  return sanitized.startsWith('.') ? '_' + sanitized.substring(1) : sanitized;
}

/**
 * Format file size for human-readable display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/**
 * Check if filename is safe (no path traversal, hidden files, etc.)
 */
export function isFileNameSafe(fileName: string): boolean {
  // Check for path traversal
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return false;
  }

  // Check for hidden files (starting with .)
  if (fileName.startsWith('.')) {
    return false;
  }

  // Check for null bytes
  if (fileName.includes('\0')) {
    return false;
  }

  // Check for control characters
  if (/[\x00-\x1F\x7F]/.test(fileName)) {
    return false;
  }

  return true;
}

/**
 * Validate chunk hash matches actual data
 */
export function validateChunkHash(chunkData: Buffer, expectedHash: string): boolean {
  const actualHash = createHash('md5').update(chunkData).digest('hex');
  return actualHash === expectedHash;
}
