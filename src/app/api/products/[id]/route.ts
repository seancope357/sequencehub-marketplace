import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    // Determine if id is a CUID (starts with 'c') or a slug
    const isId = id.startsWith('c') && id.length > 20;

    // Fetch product by ID or slug
    const product = await db.product.findUnique({
      where: isId ? { id } : { slug: id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        prices: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        media: {
          orderBy: { displayOrder: 'asc' },
        },
        versions: {
          where: { isLatest: true },
          orderBy: { versionNumber: 'desc' },
          include: {
            files: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if user has purchased this product
    let purchased = false;
    if (user) {
      const entitlement = await db.entitlement.findFirst({
        where: {
          userId: user.id,
          productId: product.id,
          isActive: true,
        },
      });
      purchased = !!entitlement;
    }

    // Update view count (in production, use a separate analytics system)
    await db.product.update({
      where: { id: product.id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    // Extract files from latest versions
    const files = product.versions.flatMap(version =>
      version.files.map(file => ({
        id: file.id,
        fileName: file.fileName,
        originalName: file.originalName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        sequenceLength: file.sequenceLength,
        fps: file.fps,
        channelCount: file.channelCount,
        versionId: version.id,
        versionNumber: version.versionNumber,
        versionName: version.versionName,
      }))
    );

    // Transform data
    const transformedProduct = {
      id: product.id,
      slug: product.slug,
      title: product.title,
      description: product.description,
      category: product.category,
      price: product.prices[0]?.amount || 0,
      includesFSEQ: product.includesFSEQ,
      includesSource: product.includesSource,
      xLightsVersionMin: product.xLightsVersionMin,
      xLightsVersionMax: product.xLightsVersionMax,
      targetUse: product.targetUse,
      expectedProps: product.expectedProps,
      licenseType: product.licenseType,
      seatCount: product.seatCount,
      creator: product.creator,
      media: product.media,
      versions: product.versions,
      files,
      saleCount: product.saleCount,
      viewCount: product.viewCount,
      purchased,
    };

    return NextResponse.json(
      { product: transformedProduct },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
