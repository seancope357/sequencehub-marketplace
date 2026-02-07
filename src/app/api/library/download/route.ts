import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/supabase/auth';
import crypto from 'crypto';

const DOWNLOAD_TTL = 60 * 5; // 5 minutes in seconds

function getDownloadSecret(): string {
  const secret = process.env.DOWNLOAD_SECRET;
  if (!secret) {
    throw new Error('DOWNLOAD_SECRET is required');
  }
  return secret;
}

export async function POST(request: NextRequest) {
  try {
    const downloadSecret = getDownloadSecret();
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

    const tokenIssuedAt = Date.now();
    const expiresAt = new Date(tokenIssuedAt + DOWNLOAD_TTL * 1000);
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Generate one-time token per file and persist for replay protection.
    const downloadUrls = await Promise.all(
      version.files.map(async (file) => {
        const token = crypto
          .createHmac('sha256', downloadSecret)
          .update(`${user.id}:${entitlement.id}:${file.id}:${tokenIssuedAt}:${crypto.randomBytes(16).toString('hex')}`)
          .digest('hex');

        await db.downloadToken.create({
          data: {
            userId: user.id,
            entitlementId: entitlement.id,
            fileId: file.id,
            token,
            expiresAt,
            ipAddress,
            userAgent,
          },
        });

        return {
          fileName: file.fileName,
          fileSize: file.fileSize,
          fileType: file.fileType,
          downloadUrl: `/api/media/${file.storageKey}?token=${encodeURIComponent(token)}`,
        };
      })
    );

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
      { error: 'Failed to generate download links' },
      { status: 500 }
    );
  }
}
