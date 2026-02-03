import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createAuditLog } from '@/lib/auth';;
import { db } from '@/lib/db';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform data
    const transformedProducts = products.map((product) => ({
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
    }));

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
    gif: 'image/gif',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}
