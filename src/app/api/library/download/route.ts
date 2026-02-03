import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';;
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/auth';;
import crypto from 'crypto';

// In production, this should be in environment variables
const DOWNLOAD_SECRET = process.env.DOWNLOAD_SECRET || 'your-download-secret-key';
const DOWNLOAD_TTL = 60 * 5; // 5 minutes in seconds

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { entitlementId, fileVersionId } = body;

    // Validate entitlement
    const entitlement = await db.entitlement.findFirst({
      where: {
        id: entitlementId,
        userId: user.id,
        isActive: true,
      },
      include: {
        product: {
          include: {
            versions: {
              include: {
                files: true,
              },
            },
          },
        },
      },
    });

    if (!entitlement) {
      // Log denied access
      await createAuditLog({
        userId: user.id,
        action: 'DOWNLOAD_ACCESS_DENIED',
        entityType: 'entitlement',
        entityId: entitlementId,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });

      return NextResponse.json(
        { error: 'No valid entitlement found' },
        { status: 403 }
      );
    }

    // Find the version with files
    const version = entitlement.product.versions.find((v) => v.id === fileVersionId);
    if (!version || !version.files || version.files.length === 0) {
      return NextResponse.json(
        { error: 'No files found for this version' },
        { status: 404 }
      );
    }

    // Check rate limiting (max 10 downloads per day per entitlement)
    const lastDownloadAt = entitlement.lastDownloadAt;
    const now = new Date();
    const downloadsSinceReset = lastDownloadAt
      ? Math.floor((now.getTime() - lastDownloadAt.getTime()) / (1000 * 60 * 60 * 24))
      : 1;

    if (downloadsSinceReset < 1 && entitlement.downloadCount >= 10) {
      await createAuditLog({
        userId: user.id,
        action: 'RATE_LIMIT_EXCEEDED',
        entityType: 'entitlement',
        entityId: entitlementId,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });

      return NextResponse.json(
        { error: 'Download limit exceeded. Please try again tomorrow.' },
        { status: 429 }
      );
    }

    // Generate signed URL for each file
    const downloadUrls = version.files.map((file) => {
      const expires = Math.floor(Date.now() / 1000) + DOWNLOAD_TTL;
      const data = `${file.storageKey}:${expires}:${user.id}`;
      const signature = crypto
        .createHmac('sha256', DOWNLOAD_SECRET)
        .update(data)
        .digest('hex');

      return {
        fileName: file.fileName,
        fileSize: file.fileSize,
        fileType: file.fileType,
        downloadUrl: `/api/media/${file.storageKey}?expires=${expires}&signature=${signature}&userId=${user.id}`,
      };
    });

    // Update download count and last download time
    await db.entitlement.update({
      where: { id: entitlementId },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadAt: new Date(),
      },
    });

    // Log successful download
    await createAuditLog({
      userId: user.id,
      action: 'DOWNLOAD_ACCESS_GRANTED',
      entityType: 'entitlement',
      entityId: entitlementId,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      {
        downloadUrls,
        message: `Download links valid for ${DOWNLOAD_TTL / 60} minutes`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error generating download:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
