/**
 * Upload Session Management
 * Manages multipart upload sessions with chunk tracking
 */

import fs from 'fs/promises';
import path from 'path';
import { UploadSession, TEMP_UPLOAD_DIR, UPLOAD_SESSION_TTL } from './types';

// In-memory storage for upload sessions
// In production, use Redis or database
const uploadSessions = new Map<string, UploadSession>();

/**
 * Create a new upload session
 */
export async function createUploadSession(session: UploadSession): Promise<void> {
  uploadSessions.set(session.uploadId, session);

  // Ensure temp directory exists
  const uploadDir = path.join(TEMP_UPLOAD_DIR, session.uploadId);
  await fs.mkdir(uploadDir, { recursive: true });
}

/**
 * Get an upload session by ID
 */
export function getUploadSession(uploadId: string): UploadSession | null {
  return uploadSessions.get(uploadId) || null;
}

/**
 * Update an upload session
 */
export function updateUploadSession(
  uploadId: string,
  updates: Partial<UploadSession>
): void {
  const session = uploadSessions.get(uploadId);
  if (!session) {
    throw new Error('Upload session not found');
  }

  uploadSessions.set(uploadId, { ...session, ...updates });
}

/**
 * Delete an upload session
 */
export async function deleteUploadSession(uploadId: string): Promise<void> {
  uploadSessions.delete(uploadId);

  // Clean up temp directory
  const uploadDir = path.join(TEMP_UPLOAD_DIR, uploadId);
  try {
    await fs.rm(uploadDir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to delete upload directory: ${uploadId}`, error);
  }
}

/**
 * Get chunk file path
 */
export function getChunkPath(uploadId: string, chunkIndex: number): string {
  return path.join(TEMP_UPLOAD_DIR, uploadId, `chunk_${chunkIndex}`);
}

/**
 * Get final file path for combined chunks
 */
export function getFinalFilePath(uploadId: string, fileName: string): string {
  return path.join(TEMP_UPLOAD_DIR, uploadId, `final_${fileName}`);
}

/**
 * Store a chunk
 */
export async function storeChunk(
  uploadId: string,
  chunkIndex: number,
  chunkData: Buffer
): Promise<void> {
  const chunkPath = getChunkPath(uploadId, chunkIndex);
  await fs.writeFile(chunkPath, chunkData);
}

/**
 * Combine all chunks into final file
 */
export async function combineChunks(
  uploadId: string,
  totalChunks: number,
  finalFilePath: string
): Promise<void> {
  const writeStream = await fs.open(finalFilePath, 'w');

  try {
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = getChunkPath(uploadId, i);
      const chunkData = await fs.readFile(chunkPath);
      await writeStream.write(chunkData);
    }
  } finally {
    await writeStream.close();
  }
}

/**
 * Clean up expired upload sessions
 * Should be run periodically (e.g., via cron job)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const now = new Date();
  let cleaned = 0;

  for (const [uploadId, session] of uploadSessions.entries()) {
    if (session.expiresAt < now) {
      await deleteUploadSession(uploadId);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Get session statistics
 */
export function getSessionStats() {
  const sessions = Array.from(uploadSessions.values());

  return {
    total: sessions.length,
    byStatus: {
      initiated: sessions.filter((s) => s.status === 'INITIATED').length,
      uploading: sessions.filter((s) => s.status === 'UPLOADING').length,
      allChunksUploaded: sessions.filter((s) => s.status === 'ALL_CHUNKS_UPLOADED').length,
      processing: sessions.filter((s) => s.status === 'PROCESSING').length,
      completed: sessions.filter((s) => s.status === 'COMPLETED').length,
      aborted: sessions.filter((s) => s.status === 'ABORTED').length,
      expired: sessions.filter((s) => s.status === 'EXPIRED').length,
    },
  };
}

/**
 * Abort an upload session
 */
export async function abortUploadSession(uploadId: string): Promise<void> {
  const session = getUploadSession(uploadId);
  if (session) {
    updateUploadSession(uploadId, { status: 'ABORTED' });
  }
  await deleteUploadSession(uploadId);
}
