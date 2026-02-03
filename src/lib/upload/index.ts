/**
 * Upload System - Public API
 * Centralized exports for the file upload system
 */

// Types
export * from './types';

// Validation
export {
  validateFile,
  validateMagicBytes,
  validateFileIntegrity,
  validateChunkHash,
  sanitizeFileName,
  formatFileSize,
  isFileNameSafe,
  getExpectedMagicByteType,
} from './validation';

// Hashing
export {
  calculateFileSHA256,
  calculateBufferSHA256,
  calculateBufferMD5,
  calculateFileMD5,
  generateUploadId,
  generateStorageKey,
  generateDownloadSignature,
  verifyDownloadSignature,
} from './hash';

// Metadata
export {
  extractFSEQMetadata,
  extractXSQMetadata,
  extractXSQMetadataAdvanced,
  extractMetadata,
} from './metadata';

// Session Management
export {
  createUploadSession,
  getUploadSession,
  updateUploadSession,
  deleteUploadSession,
  storeChunk,
  combineChunks,
  getChunkStorageKey,
  getFinalFilePath,
  cleanupExpiredSessions,
  getSessionStats,
  abortUploadSession,
} from './session';
