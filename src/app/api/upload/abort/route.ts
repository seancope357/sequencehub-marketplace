/**
 * POST /api/upload/abort
 * Abort an in-progress multipart upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { db } from '@/lib/db';
import { getUploadSession, abortUploadSession } from '@/lib/upload/session';
import { AuditAction } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { uploadId } = body;

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

    // Abort the session and clean up
    await abortUploadSession(uploadId);

    // Log to audit trail
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.FILE_DELETED,
        entityType: 'upload_session',
        entityId: uploadId,
        metadata: JSON.stringify({
          fileName: session.fileName,
          reason: 'User aborted upload',
          uploadedChunks: session.uploadedChunks.length,
          totalChunks: session.totalChunks,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error aborting upload:', error);

    return NextResponse.json(
      { error: 'Failed to abort upload' },
      { status: 500 }
    );
  }
}
