import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createAuditLog } from '@/lib/supabase/auth';
import { isCreatorOrAdmin, isAdmin } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { generateDownloadUrl } from '@/lib/storage';
import { getStripeConfigStatus } from '@/lib/stripe-connect';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!isCreatorOrAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Creator role required' },
        { status: 403 }
      );
    }

    // Get user's products
    const products = await db.product.findMany({
      where: { creatorId: user.id },
      include: {
        prices: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        media: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform data
    const transformedProducts = await Promise.all(
      products.map(async (product) => {
        const mediaWithUrls = await Promise.all(
          product.media.map(async (item) => {
            try {
              const url = await generateDownloadUrl(item.storageKey, 3600, 'PREVIEW');
              return { ...item, url };
            } catch (err) {
              console.warn('Failed to generate media URL:', err);
              return { ...item, url: null };
            }
          })
        );

        return {
          id: product.id,
          slug: product.slug,
          title: product.title,
          category: product.category,
          status: product.status,
          price: product.prices[0]?.amount || 0,
          includesFSEQ: product.includesFSEQ,
          includesSource: product.includesSource,
          saleCount: product.saleCount,
          viewCount: product.viewCount,
          createdAt: product.createdAt.toISOString(),
          media: mediaWithUrls,
        };
      })
    );

    return NextResponse.json(
      { products: transformedProducts },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!isCreatorOrAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Creator role required' },
        { status: 403 }
      );
    }

    // Apply rate limiting: 10 product creations per hour per user
    const limitResult = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.PRODUCT_CREATE,
      byUser: true,
      byIp: false,
      message: 'Product creation limit exceeded. You can create up to 10 products per hour.',
    });

    if (!limitResult.allowed) {
      return limitResult.response;
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      price,
      xLightsVersionMin,
      xLightsVersionMax,
      targetUse,
      expectedProps,
      includesFSEQ,
      includesSource,
      licenseType,
      seatCount,
      status = 'DRAFT',
      files = [],
      media = [],
    } = body;

    // Validation
    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    if (price === undefined || price === null) {
      return NextResponse.json(
        { error: 'Price is required' },
        { status: 400 }
      );
    }

    const wantsPublish = status === 'PUBLISHED';

    if (wantsPublish && !isAdmin(user)) {
      const stripeConfig = getStripeConfigStatus();
      if (!stripeConfig.configured) {
        return NextResponse.json(
          { error: stripeConfig.message || 'Stripe Connect is not configured.' },
          { status: 409 }
        );
      }

      const creatorAccount = await db.creatorAccount.findUnique({
        where: { userId: user.id },
        select: { stripeAccountId: true, onboardingStatus: true },
      });

      if (!creatorAccount?.stripeAccountId || creatorAccount.onboardingStatus !== 'COMPLETED') {
        return NextResponse.json(
          { error: 'Stripe Connect onboarding is required before publishing products.' },
          { status: 409 }
        );
      }
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);

    // Validate files payload (if present)
    if (Array.isArray(files) && files.length > 0) {
      for (const file of files) {
        if (!file?.fileName || !file?.fileType || !file?.fileSize) {
          return NextResponse.json(
            { error: 'Each file must include fileName, fileType, and fileSize' },
            { status: 400 }
          );
        }

        if (!file?.storageKey || !file?.fileHash) {
          return NextResponse.json(
            { error: 'Each file must include storageKey and fileHash' },
            { status: 400 }
          );
        }
      }
    }

    // Validate media payload (if present)
    if (Array.isArray(media) && media.length > 0) {
      for (const item of media) {
        if (!item?.fileName || !item?.fileSize || !item?.storageKey || !item?.fileHash) {
          return NextResponse.json(
            { error: 'Each media item must include fileName, fileSize, storageKey, and fileHash' },
            { status: 400 }
          );
        }

        if (!item?.mediaType || !['cover', 'gallery', 'preview'].includes(item.mediaType)) {
          return NextResponse.json(
            { error: 'Each media item must include a valid mediaType (cover, gallery, preview)' },
            { status: 400 }
          );
        }
      }
    }

    // Create product
    const product = await db.product.create({
      data: {
        slug,
        creatorId: user.id,
        title,
        description,
        category,
        status,
        licenseType: licenseType || 'PERSONAL',
        seatCount: licenseType === 'COMMERCIAL' ? seatCount : null,
        includesFSEQ: includesFSEQ || false,
        includesSource: includesSource || false,
        xLightsVersionMin,
        xLightsVersionMax,
        targetUse,
        expectedProps,
        prices: {
          create: {
            amount: parseFloat(price),
            currency: 'USD',
            isActive: true,
          },
        },
        media: media.length
          ? {
              create: media.map((item: any, index: number) => ({
                mediaType: item.mediaType,
                fileName: item.fileName,
                originalName: item.originalName || item.fileName,
                fileSize: item.fileSize,
                fileHash: item.fileHash,
                storageKey: item.storageKey,
                mimeType: item.mimeType || getMimeType(item.fileName),
                width: item.width || null,
                height: item.height || null,
                altText: item.altText || null,
                displayOrder: item.displayOrder ?? index,
              })),
            }
          : undefined,
        versions: {
          create: {
            versionNumber: 1,
            versionName: '1.0.0',
            isLatest: true,
            publishedAt: status === 'PUBLISHED' ? new Date() : null,
            files: files.length
              ? {
                  create: files.map((file: any) => ({
                    fileName: file.fileName,
                    originalName: file.originalName || file.fileName,
                    fileType: file.fileType,
                    fileSize: file.fileSize,
                    fileHash: file.fileHash,
                    storageKey: file.storageKey,
                    mimeType: file.mimeType || getMimeType(file.fileName),
                    metadata: file.metadata
                      ? typeof file.metadata === 'string'
                        ? file.metadata
                        : JSON.stringify(file.metadata)
                      : null,
                    sequenceLength: file.sequenceLength,
                    fps: file.fps,
                    channelCount: file.channelCount,
                  })),
                }
              : undefined,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'PRODUCT_CREATED',
      entityType: 'product',
      entityId: product.id,
      changes: JSON.stringify({
        title,
        status,
        category,
        price,
      }),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      {
        product: {
          id: product.id,
          slug: product.slug,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    fseq: 'application/octet-stream',
    xsq: 'application/xml',
    xml: 'application/xml',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    gif: 'image/gif',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}
