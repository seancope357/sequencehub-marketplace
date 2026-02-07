import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/supabase/auth';
import { generateDownloadUrl } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const user = await getCurrentUser();
    const isAdmin = Boolean(user?.roles?.some((role) => role.role === 'ADMIN'));

    // Fetch product
    const product = await db.product.findUnique({
      where: { slug },
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
        },
        files: {
          include: {
            version: {
              select: {
                versionNumber: true,
                versionName: true,
              },
            },
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

    const isOwner = Boolean(user && product.creatorId === user.id);
    if (product.status !== 'PUBLISHED' && !isOwner && !isAdmin) {
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

    // Transform data
    const mediaWithUrls = await Promise.all(
      product.media.map(async (media) => {
        try {
          const url = await generateDownloadUrl(media.storageKey, 3600, 'PREVIEW');
          return { ...media, url };
        } catch (err) {
          console.warn('Failed to generate media URL:', err);
          return { ...media, url: null };
        }
      })
    );

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
      media: mediaWithUrls,
      versions: product.versions,
      files: product.files.map((file) => ({
        id: file.id,
        fileName: file.fileName,
        originalName: file.originalName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        sequenceLength: file.sequenceLength,
        fps: file.fps,
        channelCount: file.channelCount,
      })),
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
