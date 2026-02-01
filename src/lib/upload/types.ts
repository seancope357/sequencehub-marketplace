/**
 * Upload System Types
 * Type definitions for the file upload system
 */

import { FileType } from '@prisma/client';

export interface UploadInitiateRequest {
  fileName: string;
  fileSize: number;
  mimeType: string;
  productId?: string;
  versionId?: string;
  uploadType: FileType;
}

export interface UploadInitiateResponse {
  uploadId: string;
  chunkSize: number;
  totalChunks: number;
  expiresAt: string;
}

export interface ChunkUploadRequest {
  uploadId: string;
  chunkIndex: number;
  chunkData: Buffer;
  chunkHash: string; // MD5 hash of chunk for verification
}

export interface ChunkUploadResponse {
  success: boolean;
  chunkIndex: number;
  progress: number; // 0 to 1
}

export interface CompleteUploadResponse {
  fileId: string;
  storageKey: string;
  metadata: Record<string, any>;
  deduplicated: boolean;
}

export interface UploadSession {
  uploadId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  fileType: FileType;
  mimeType: string;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number[];
  status: UploadStatus;
  productId?: string;
  versionId?: string;
  expiresAt: Date;
  createdAt: Date;
}

export type UploadStatus =
  | 'INITIATED'
  | 'UPLOADING'
  | 'ALL_CHUNKS_UPLOADED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'ABORTED'
  | 'EXPIRED';

export interface FSEQMetadata {
  version: string;
  channelCount: number;
  frameCount: number;
  stepTime: number; // milliseconds
  sequenceLength: number; // seconds
  fps: number;
  compressionType?: string;
  variableHeaders?: Record<string, any>;
}

export interface XSQMetadata {
  xLightsVersion?: string;
  mediaFile?: string;
  sequenceType?: string;
  sequenceTiming?: string;
  modelCount?: number;
  effectCount?: number;
}

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface FileUploadConfig {
  maxFileSize: number;
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  validateMagicBytes: boolean;
}

export const FILE_TYPE_CONFIGS: Record<FileType, FileUploadConfig> = {
  RENDERED: {
    maxFileSize: 500 * 1024 * 1024, // 500MB
    allowedExtensions: ['.fseq'],
    allowedMimeTypes: ['application/octet-stream', 'application/x-fseq'],
    validateMagicBytes: true,
  },
  SOURCE: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedExtensions: ['.xsq', '.xml'],
    allowedMimeTypes: ['text/xml', 'application/xml', 'application/x-xsq'],
    validateMagicBytes: true,
  },
  ASSET: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedExtensions: ['.mp3', '.wav', '.ogg', '.xmodel', '.jpg', '.jpeg', '.png', '.gif'],
    allowedMimeTypes: [
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/octet-stream',
    ],
    validateMagicBytes: false,
  },
  PREVIEW: {
    maxFileSize: 200 * 1024 * 1024, // 200MB
    allowedExtensions: ['.mp4', '.webm', '.mov', '.gif'],
    allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'image/gif'],
    validateMagicBytes: false,
  },
};

export const MAGIC_BYTES: Record<string, Buffer> = {
  FSEQ: Buffer.from('PSEQ'),
  PNG: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  JPEG: Buffer.from([0xff, 0xd8, 0xff]),
  GIF: Buffer.from([0x47, 0x49, 0x46]),
  MP4: Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]),
  XML: Buffer.from('<?xml'),
};

export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
export const UPLOAD_SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
export const TEMP_UPLOAD_DIR = '/tmp/uploads';
