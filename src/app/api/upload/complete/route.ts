/**
 * POST /api/upload/complete
 * Complete a multipart upload, combine chunks, and process file
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
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
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  let uploadId: string | undefined;

  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limitResult = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.UPLOAD_FILE,
      byUser: true,
      byIp: false,
      message: 'Upload completion rate limit exceeded. Please try again later.',
    });
    if (!limitResult.allowed) {
      return limitResult.response;
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
    const session = await getUploadSession(uploadId);
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
    await updateUploadSession(uploadId, { status: 'PROCESSING' });

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
        fileHash: duplicate.fileHash,
        mimeType: duplicate.mimeType || undefined,
        sequenceLength: duplicate.sequenceLength || undefined,
        fps: duplicate.fps || undefined,
        channelCount: duplicate.channelCount || undefined,
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
      fileType: session.fileType,
    });

    let productFileId: string | null = null;

    // Create ProductFile only if we have a versionId to attach it to
    if (session.versionId) {
      const productFile = await db.productFile.create({
        data: {
          versionId: session.versionId,
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

      productFileId = productFile.id;
    }

    // Log to audit trail
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.FILE_UPLOADED,
        entityType: productFileId ? 'product_file' : 'upload_file',
        entityId: productFileId || storageKey,
        metadata: JSON.stringify({
          fileName: session.fileName,
          fileSize: session.fileSize,
          fileType: session.fileType,
          fileHash,
          storageKey,
          hasMetadata: !!metadata,
          linkedToVersion: Boolean(session.versionId),
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    // Mark session complete then clean up
    await updateUploadSession(uploadId, { status: 'COMPLETED' });
    await deleteUploadSession(uploadId);

    const response: CompleteUploadResponse = {
      fileId: productFileId || undefined,
      storageKey,
      metadata: metadata || {},
      deduplicated: false,
      fileHash,
      mimeType: session.mimeType,
      sequenceLength: metadata?.sequenceLength,
      fps: metadata?.fps,
      channelCount: metadata?.channelCount,
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
