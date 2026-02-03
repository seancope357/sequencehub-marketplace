/**
 * POST /api/upload/chunk
 * Upload a single chunk of a multipart upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { db } from '@/lib/db';
import { getUploadSession, updateUploadSession, storeChunk } from '@/lib/upload/session';
import { validateChunkHash } from '@/lib/upload/validation';
import { ChunkUploadResponse } from '@/lib/upload/types';
import { AuditAction } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const uploadId = formData.get('uploadId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const chunkHash = formData.get('chunkHash') as string;
    const chunkFile = formData.get('chunk') as File;

    // Validate required fields
    if (!uploadId || isNaN(chunkIndex) || !chunkHash || !chunkFile) {
      return NextResponse.json(
        { error: 'Missing required fields: uploadId, chunkIndex, chunkHash, chunk' },
        { status: 400 }
      );
    }

    // Get upload session
    const session = getUploadSession(uploadId);
    if (!session) {
      return NextResponse.json(
        { error: 'Upload session not found' },
        { status: 404 }
      );
    }

    // Verify user owns this session
    if (session.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check session status
    if (session.status === 'COMPLETED' || session.status === 'ABORTED') {
      return NextResponse.json(
        { error: `Upload is ${session.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Check if session expired
    if (session.expiresAt < new Date()) {
      updateUploadSession(uploadId, { status: 'EXPIRED' });
      return NextResponse.json(
        { error: 'Upload session expired' },
        { status: 400 }
      );
    }

    // Validate chunk index
    if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
      return NextResponse.json(
        { error: `Invalid chunk index. Must be 0-${session.totalChunks - 1}` },
        { status: 400 }
      );
    }

    // Check if chunk already uploaded
    if (session.uploadedChunks.includes(chunkIndex)) {
      return NextResponse.json(
        { error: 'Chunk already uploaded' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const chunkBuffer = Buffer.from(await chunkFile.arrayBuffer());

    // Verify chunk hash
    if (!validateChunkHash(chunkBuffer, chunkHash)) {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.SECURITY_ALERT,
          entityType: 'upload_chunk',
          entityId: uploadId,
          metadata: JSON.stringify({
            reason: 'Chunk hash mismatch',
            chunkIndex,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        },
      });

      return NextResponse.json(
        { error: 'Chunk hash mismatch - possible data corruption' },
        { status: 400 }
      );
    }

    // Store chunk
    await storeChunk(uploadId, chunkIndex, chunkBuffer);

    // Update session
    const uploadedChunks = [...session.uploadedChunks, chunkIndex];
    const allChunksUploaded = uploadedChunks.length === session.totalChunks;

    updateUploadSession(uploadId, {
      uploadedChunks,
      status: allChunksUploaded ? 'ALL_CHUNKS_UPLOADED' : 'UPLOADING',
    });

    const response: ChunkUploadResponse = {
      success: true,
      chunkIndex,
      progress: uploadedChunks.length / session.totalChunks,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error uploading chunk:', error);

    return NextResponse.json(
      { error: 'Failed to upload chunk' },
      { status: 500 }
    );
  }
}
