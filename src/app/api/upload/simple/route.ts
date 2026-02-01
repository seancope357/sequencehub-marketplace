/**
 * POST /api/upload/simple
 * Simple single-file upload endpoint (non-multipart)
 * For smaller files that don't need chunking
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { validateFile, validateFileIntegrity, sanitizeFileName } from '@/lib/upload/validation';
import { calculateBufferSHA256, generateStorageKey } from '@/lib/upload/hash';
import { extractMetadata } from '@/lib/upload/metadata';
import { uploadBuffer } from '@/lib/storage';
import { FileType, AuditAction } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting: 10 uploads per hour per user
    const limitResult = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.UPLOAD_FILE,
      byUser: true,
      byIp: false,
      message: 'Upload limit exceeded. You can upload up to 10 files per hour.',
    });

    if (!limitResult.allowed) {
      return limitResult.response;
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as FileType;
    const productId = formData.get('productId') as string | null;
    const versionId = formData.get('versionId') as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'Missing required field: file' },
        { status: 400 }
      );
    }

    if (!fileType) {
      return NextResponse.json(
        { error: 'Missing required field: fileType' },
        { status: 400 }
      );
    }

    // Validate file type enum
    if (!['SOURCE', 'RENDERED', 'ASSET', 'PREVIEW'].includes(fileType)) {
      return NextResponse.json(
        { error: 'Invalid fileType. Must be SOURCE, RENDERED, ASSET, or PREVIEW' },
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

    const fileName = sanitizeFileName(file.name);
    const fileSize = file.size;
    const mimeType = file.type;

    // Validate file
    const validation = validateFile(fileName, fileSize, mimeType, fileType);
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

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Validate file integrity (magic bytes)
    const integrityCheck = validateFileIntegrity(fileBuffer, fileName);
    if (!integrityCheck.valid) {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.SECURITY_ALERT,
          entityType: 'upload_file',
          metadata: JSON.stringify({
            reason: 'File integrity check failed',
            fileName,
            errors: integrityCheck.errors,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        },
      });

      return NextResponse.json(
        {
          error: 'File integrity check failed',
          details: integrityCheck.errors,
        },
        { status: 400 }
      );
    }

    // Calculate SHA-256 hash
    const fileHash = calculateBufferSHA256(fileBuffer);

    // Check for duplicate by hash
    const duplicate = await db.productFile.findFirst({
      where: { fileHash },
    });

    if (duplicate) {
      // File already exists - deduplicate
      return NextResponse.json({
        fileId: duplicate.id,
        storageKey: duplicate.storageKey,
        metadata: duplicate.metadata ? JSON.parse(duplicate.metadata) : {},
        deduplicated: true,
      });
    }

    // Extract metadata if applicable (need to write to temp file for metadata extraction)
    let metadata: any = null;
    if (fileType === 'RENDERED' || fileType === 'SOURCE') {
      try {
        // Write to temp file
        const tempDir = os.tmpdir();
        tempFilePath = path.join(tempDir, `upload_${Date.now()}_${fileName}`);
        await fs.writeFile(tempFilePath, fileBuffer);

        // Extract metadata
        metadata = await extractMetadata(tempFilePath, fileType);
      } catch (error) {
        console.warn('Metadata extraction failed:', error);
        // Continue without metadata - it's not critical
      }
    }

    // Generate storage key
    const storageKey = generateStorageKey(fileName, fileType);

    // Upload to cloud storage (R2 or local)
    await uploadBuffer(fileBuffer, storageKey, {
      contentType: mimeType,
      metadata: {
        originalName: fileName,
        fileType,
      },
    });

    // Create ProductFile record
    const productFile = await db.productFile.create({
      data: {
        versionId: versionId || 'temp', // Will be linked later if temp
        fileName,
        originalName: fileName,
        fileType,
        fileSize,
        fileHash,
        storageKey,
        mimeType,
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
          fileName,
          fileSize,
          fileType,
          fileHash,
          storageKey,
          hasMetadata: !!metadata,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    // Clean up temp file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (error) {
        console.warn('Failed to delete temp file:', error);
      }
    }

    return NextResponse.json({
      fileId: productFile.id,
      storageKey,
      metadata: metadata || {},
      deduplicated: false,
    });
  } catch (error) {
    console.error('Error uploading file:', error);

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

    // Clean up temp file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch {
        // Ignore cleanup errors
      }
    }

    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
