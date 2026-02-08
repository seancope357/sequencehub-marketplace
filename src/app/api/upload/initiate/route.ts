/**
 * POST /api/upload/initiate
 * Initiate a multipart file upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';;
import { db } from '@/lib/db';
import {
  UploadInitiateRequest,
  UploadInitiateResponse,
  CHUNK_SIZE,
  UPLOAD_SESSION_TTL,
} from '@/lib/upload/types';
import { validateFile } from '@/lib/upload/validation';
import { generateUploadId } from '@/lib/upload/hash';
import { createUploadSession } from '@/lib/upload/session';
import { AuditAction } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: UploadInitiateRequest = await request.json();
    const { fileName, fileSize, mimeType, uploadType, productId, versionId } = body;

    // Validate required fields
    if (!fileName || !fileSize || !mimeType || !uploadType) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileSize, mimeType, uploadType' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile(fileName, fileSize, mimeType, uploadType);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'File validation failed',
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 }
      );
    }

    // If productId is provided, verify ownership
    if (productId) {
      const product = await db.product.findUnique({
        where: { id: productId },
      });

      if (!product || product.creatorId !== user.id) {
        return NextResponse.json(
          { error: 'Product not found or access denied' },
          { status: 403 }
        );
      }
    }

    // Calculate chunks
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

    // Generate upload ID
    const uploadId = generateUploadId();

    // Create upload session
    const expiresAt = new Date(Date.now() + UPLOAD_SESSION_TTL);
    await createUploadSession({
      uploadId,
      userId: user.id,
      fileName,
      fileSize,
      fileType: uploadType,
      mimeType,
      chunkSize: CHUNK_SIZE,
      totalChunks,
      uploadedChunks: [],
      status: 'INITIATED',
      productId,
      versionId,
      expiresAt,
      createdAt: new Date(),
    });

    // Log to audit trail
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.FILE_UPLOADED,
        entityType: 'upload_session',
        entityId: uploadId,
        metadata: JSON.stringify({
          fileName,
          fileSize,
          uploadType,
          totalChunks,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    const response: UploadInitiateResponse = {
      uploadId,
      chunkSize: CHUNK_SIZE,
      totalChunks,
      expiresAt: expiresAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error initiating upload:', error);

    // Log security alert
    await db.auditLog.create({
      data: {
        action: AuditAction.SECURITY_ALERT,
        entityType: 'upload_error',
        metadata: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json(
      { error: 'Failed to initiate upload' },
      { status: 500 }
    );
  }
}
