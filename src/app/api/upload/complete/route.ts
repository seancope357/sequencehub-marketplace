/**
 * POST /api/upload/complete
 * Complete a multipart upload, combine chunks, and process file
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';;
import { db } from '@/lib/db';
import {
  getUploadSession,
  updateUploadSession,
  combineChunks,
  getFinalFilePath,
  deleteUploadSession,
} from '@/lib/upload/session';
import { calculateFileSHA256, generateStorageKey } from '@/lib/upload/hash';
import { extractMetadata } from '@/lib/upload/metadata';
import { uploadFile } from '@/lib/storage';
import { validateFileIntegrity } from '@/lib/upload/validation';
import { CompleteUploadResponse } from '@/lib/upload/types';
import { AuditAction } from '@prisma/client';
import fs from 'fs/promises';

export async function POST(request: NextRequest) {
  let uploadId: string | undefined;

  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    uploadId = body.uploadId;

    if (!uploadId) {
      return NextResponse.json(
        { error: 'Missing required field: uploadId' },
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

    // Verify all chunks uploaded
    if (session.uploadedChunks.length !== session.totalChunks) {
      return NextResponse.json(
        {
          error: 'Not all chunks uploaded',
          uploaded: session.uploadedChunks.length,
          total: session.totalChunks,
        },
        { status: 400 }
      );
    }

    // Update status to processing
    updateUploadSession(uploadId, { status: 'PROCESSING' });

    // Combine chunks into final file
    const finalFilePath = getFinalFilePath(uploadId, session.fileName);
    await combineChunks(uploadId, session.totalChunks, finalFilePath);

    // Read first 1KB for magic byte validation
    const fd = await fs.open(finalFilePath, 'r');
    const headerBuffer = Buffer.alloc(1024);
    await fd.read(headerBuffer, 0, 1024, 0);
    await fd.close();

    // Validate file integrity (magic bytes)
    const integrityCheck = validateFileIntegrity(headerBuffer, session.fileName);
    if (!integrityCheck.valid) {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.SECURITY_ALERT,
          entityType: 'upload_file',
          entityId: uploadId,
          metadata: JSON.stringify({
            reason: 'File integrity check failed',
            errors: integrityCheck.errors,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        },
      });

      // Clean up
      await deleteUploadSession(uploadId);

      return NextResponse.json(
        {
          error: 'File integrity check failed',
          details: integrityCheck.errors,
        },
        { status: 400 }
      );
    }

    // Calculate SHA-256 hash
    const fileHash = await calculateFileSHA256(finalFilePath);

    // Check for duplicate by hash
    const duplicate = await db.productFile.findFirst({
      where: { fileHash },
    });

    if (duplicate) {
      // File already exists - deduplicate
      await deleteUploadSession(uploadId);

      const response: CompleteUploadResponse = {
        fileId: duplicate.id,
        storageKey: duplicate.storageKey,
        metadata: duplicate.metadata ? JSON.parse(duplicate.metadata) : {},
        deduplicated: true,
      };

      return NextResponse.json(response);
    }

    // Extract metadata based on file type
    let metadata: any = null;
    try {
      metadata = await extractMetadata(finalFilePath, session.fileType);
    } catch (error) {
      console.warn('Metadata extraction failed:', error);
      // Continue without metadata - it's not critical
    }

    // Generate storage key
    const storageKey = generateStorageKey(session.fileName, session.fileType);

    // Upload to cloud storage (R2 or local)
    await uploadFile(finalFilePath, storageKey, {
      contentType: session.mimeType,
      metadata: {
        originalName: session.fileName,
        fileType: session.fileType,
        uploadId,
      },
    });

    // Create ProductFile record
    const productFile = await db.productFile.create({
      data: {
        versionId: session.versionId || 'temp', // Will be linked later if temp
        fileName: session.fileName,
        originalName: session.fileName,
        fileType: session.fileType,
        fileSize: session.fileSize,
        fileHash,
        storageKey,
        mimeType: session.mimeType,
        metadata: metadata ? JSON.stringify(metadata) : null,
        sequenceLength: metadata?.sequenceLength,
        fps: metadata?.fps,
        channelCount: metadata?.channelCount,
      },
    });

    // Log to audit trail
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.FILE_UPLOADED,
        entityType: 'product_file',
        entityId: productFile.id,
        metadata: JSON.stringify({
          fileName: session.fileName,
          fileSize: session.fileSize,
          fileType: session.fileType,
          fileHash,
          storageKey,
          hasMetadata: !!metadata,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    // Clean up upload session
    await deleteUploadSession(uploadId);

    // Update session status
    updateUploadSession(uploadId, { status: 'COMPLETED' });

    const response: CompleteUploadResponse = {
      fileId: productFile.id,
      storageKey,
      metadata: metadata || {},
      deduplicated: false,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error completing upload:', error);

    // Log security alert
    await db.auditLog.create({
      data: {
        action: AuditAction.SECURITY_ALERT,
        entityType: 'upload_error',
        entityId: uploadId,
        metadata: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    // Try to clean up
    if (uploadId) {
      try {
        await deleteUploadSession(uploadId);
      } catch {
        // Ignore cleanup errors
      }
    }

    return NextResponse.json(
      { error: 'Failed to complete upload' },
      { status: 500 }
    );
  }
}
