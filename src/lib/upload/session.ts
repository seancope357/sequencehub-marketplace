/**
 * Upload Session Management
 * Manages multipart upload sessions with chunk tracking
 */

import fs from 'fs/promises';
import path from 'path';
import { UploadSession, TEMP_UPLOAD_DIR, UPLOAD_SESSION_TTL } from './types';
import { db } from '@/lib/db';
import { uploadBuffer, downloadFile, deleteFile } from '@/lib/storage';

const CHUNK_STORAGE_TYPE = 'ASSET' as const;

/**
 * Create a new upload session
 */
export async function createUploadSession(session: UploadSession): Promise<void> {
  await db.uploadSession.create({
    data: {
      id: session.uploadId,
      userId: session.userId,
      fileName: session.fileName,
      fileSize: session.fileSize,
      fileType: session.fileType,
      mimeType: session.mimeType,
      chunkSize: session.chunkSize,
      totalChunks: session.totalChunks,
      uploadedChunks: session.uploadedChunks,
      status: session.status,
      productId: session.productId,
      versionId: session.versionId,
      expiresAt: session.expiresAt,
    },
  });
}

/**
 * Get an upload session by ID
 */
export async function getUploadSession(uploadId: string): Promise<UploadSession | null> {
  const session = await db.uploadSession.findUnique({
    where: { id: uploadId },
  });

  if (!session) {
    return null;
  }

  return {
    uploadId: session.id,
    userId: session.userId,
    fileName: session.fileName,
    fileSize: session.fileSize,
    fileType: session.fileType,
    mimeType: session.mimeType,
    chunkSize: session.chunkSize,
    totalChunks: session.totalChunks,
    uploadedChunks: (session.uploadedChunks as number[]) || [],
    status: session.status,
    productId: session.productId || undefined,
    versionId: session.versionId || undefined,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
  };
}

/**
 * Update an upload session
 */
export async function updateUploadSession(
  uploadId: string,
  updates: Partial<UploadSession>
): Promise<void> {
  await db.uploadSession.update({
    where: { id: uploadId },
    data: {
      fileName: updates.fileName,
      fileSize: updates.fileSize,
      fileType: updates.fileType,
      mimeType: updates.mimeType,
      chunkSize: updates.chunkSize,
      totalChunks: updates.totalChunks,
      uploadedChunks: updates.uploadedChunks,
      status: updates.status,
      productId: updates.productId,
      versionId: updates.versionId,
      expiresAt: updates.expiresAt,
    },
  });
}

/**
 * Delete an upload session
 */
export async function deleteUploadSession(uploadId: string): Promise<void> {
  const session = await getUploadSession(uploadId);
  if (session) {
    await deleteStoredChunks(uploadId, session.uploadedChunks);
  }

  await db.uploadSession.delete({
    where: { id: uploadId },
  });

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
export function getChunkStorageKey(uploadId: string, chunkIndex: number): string {
  return `uploads/${uploadId}/chunk_${chunkIndex}`;
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
  const storageKey = getChunkStorageKey(uploadId, chunkIndex);
  await uploadBuffer(chunkData, storageKey, {
    contentType: 'application/octet-stream',
    fileType: CHUNK_STORAGE_TYPE,
  });
}

/**
 * Combine all chunks into final file
 */
export async function combineChunks(
  uploadId: string,
  totalChunks: number,
  finalFilePath: string
): Promise<void> {
  const uploadDir = path.join(TEMP_UPLOAD_DIR, uploadId);
  await fs.mkdir(uploadDir, { recursive: true });

  const writeStream = await fs.open(finalFilePath, 'w');

  try {
    for (let i = 0; i < totalChunks; i++) {
      const storageKey = getChunkStorageKey(uploadId, i);
      const chunkData = await downloadFile(storageKey, CHUNK_STORAGE_TYPE);
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
  const expiredSessions = await db.uploadSession.findMany({
    where: {
      expiresAt: { lt: now },
    },
    select: { id: true },
  });

  for (const session of expiredSessions) {
    await deleteUploadSession(session.id);
  }

  return expiredSessions.length;
}

/**
 * Get session statistics
 */
export function getSessionStats() {
  return db.uploadSession
    .findMany({
      select: { status: true },
    })
    .then((sessions) => ({
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
    }));
}

/**
 * Abort an upload session
 */
export async function abortUploadSession(uploadId: string): Promise<void> {
  const session = await getUploadSession(uploadId);
  if (session) {
    await updateUploadSession(uploadId, { status: 'ABORTED' });
  }
  await deleteUploadSession(uploadId);
}

async function deleteStoredChunks(uploadId: string, chunkIndices: number[]) {
  for (const chunkIndex of chunkIndices) {
    const storageKey = getChunkStorageKey(uploadId, chunkIndex);
    try {
      await deleteFile(storageKey, CHUNK_STORAGE_TYPE);
    } catch (error) {
      console.warn(`Failed to delete chunk ${chunkIndex} for ${uploadId}:`, error);
    }
  }
}
