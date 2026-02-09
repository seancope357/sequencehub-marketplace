import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createAuditLog } from '@/lib/auth';
import { isCreatorOrAdmin } from '@/lib/auth-utils';
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

    // Require CREATOR or ADMIN role
    if (!isCreatorOrAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - CREATOR role required to view products' },
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

    // Require CREATOR or ADMIN role
    if (!isCreatorOrAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - CREATOR role required to create products' },
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

    // Check for duplicate slug
    const existingProduct = await db.product.findUnique({
      where: { slug },
    });

    const finalSlug = existingProduct
      ? `${slug}-${Date.now()}`
      : slug;

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
            { error: 'Some uploaded files are invalid or already linked to another product' },
            { status: 400 }
          );
        }
      }
    }

    // Create product with version
    const product = await db.product.create({
      data: {
        slug: finalSlug,
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
          },
        },
        media: {
          create: [
            {
              mediaType: 'cover',
              fileName: 'cover.jpg',
              originalName: 'cover.jpg',
              fileSize: 0,
              fileHash: 'placeholder',
              storageKey: `covers/${finalSlug}.jpg`,
              mimeType: 'image/jpeg',
            },
          ],
        },
      },
      include: {
        versions: true,
      },
    });

    // Link uploaded files to the new version
    if (files && files.length > 0) {
      const fileIds = files.map((f: any) => f.fileId).filter(Boolean);

      if (fileIds.length > 0) {
        const firstVersion = product.versions[0];

        await db.productFile.updateMany({
          where: {
            id: { in: fileIds },
            versionId: 'temp',
          },
          data: {
            versionId: firstVersion.id,
          },
        });
      }
    }

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
