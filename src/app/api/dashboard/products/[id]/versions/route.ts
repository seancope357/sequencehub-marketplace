import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createAuditLog } from '@/lib/auth';
import { isCreatorOrAdmin } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Require CREATOR or ADMIN role
    if (!isCreatorOrAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - CREATOR role required to create product versions' },
        { status: 403 }
      );
    }

    // Apply rate limiting: 20 version creations per hour per user
    const limitResult = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.PRODUCT_CREATE,
      byUser: true,
      byIp: false,
      message: 'Version creation limit exceeded. Please try again later.',
    });

    if (!limitResult.allowed) {
      return limitResult.response;
    }

    const { id: productId } = await params;

    // Verify product exists and user owns it
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (product.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You do not own this product' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      versionName,
      changelog,
      files = [],
    } = body;

    // Auto-increment version number
    const maxVersionNumber = product.versions[0]?.versionNumber || 0;
    const newVersionNumber = maxVersionNumber + 1;

    // Default version name if not provided
    const finalVersionName = versionName?.trim() || `${newVersionNumber}.0.0`;

    // Validate uploaded fileIds if provided
    if (files && files.length > 0) {
      const fileIds = files.map((f: any) => f.fileId).filter(Boolean);

      if (fileIds.length > 0) {
        // Verify all files exist and have versionId='temp' (uploaded but not linked yet)
        const uploadedFiles = await db.productFile.findMany({
          where: {
            id: { in: fileIds },
            versionId: 'temp',
          },
        });

        if (uploadedFiles.length !== fileIds.length) {
          return NextResponse.json(
            { error: 'Some uploaded files are invalid or already linked to another version' },
            { status: 400 }
          );
        }
      }
    }

    // Create new version in a transaction
    const result = await db.$transaction(async (tx) => {
      // Set all existing versions to not latest
      await tx.productVersion.updateMany({
        where: {
          productId,
          isLatest: true,
        },
        data: {
          isLatest: false,
        },
      });

      // Create new version
      const newVersion = await tx.productVersion.create({
        data: {
          productId,
          versionNumber: newVersionNumber,
          versionName: finalVersionName,
          changelog: changelog?.trim() || null,
          isLatest: true,
          publishedAt: product.status === 'PUBLISHED' ? new Date() : null,
        },
      });

      // Link uploaded files to the new version
      if (files && files.length > 0) {
        const fileIds = files.map((f: any) => f.fileId).filter(Boolean);

        if (fileIds.length > 0) {
          await tx.productFile.updateMany({
            where: {
              id: { in: fileIds },
              versionId: 'temp',
            },
            data: {
              versionId: newVersion.id,
            },
          });
        }
      }

      return newVersion;
    });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'PRODUCT_UPDATED',
      entityType: 'product_version',
      entityId: result.id,
      changes: JSON.stringify({
        productId,
        versionNumber: newVersionNumber,
        versionName: finalVersionName,
        fileCount: files?.length || 0,
      }),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      {
        version: {
          id: result.id,
          versionNumber: result.versionNumber,
          versionName: result.versionName,
          productId: result.productId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product version:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
