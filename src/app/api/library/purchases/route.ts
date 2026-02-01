import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';;
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all entitlements for this user
    const entitlements = await db.entitlement.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        product: {
          include: {
            media: {
              where: { mediaType: 'cover' },
              take: 1,
            },
          },
        },
        version: true,
        order: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const purchases = entitlements.map((entitlement) => ({
      id: entitlement.id,
      product: {
        id: entitlement.product.id,
        slug: entitlement.product.slug,
        title: entitlement.product.title,
        category: entitlement.product.category,
        media: entitlement.product.media[0] || undefined,
      },
      version: {
        id: entitlement.version.id,
        versionNumber: entitlement.version.versionNumber,
        versionName: entitlement.version.versionName,
        publishedAt: entitlement.version.publishedAt,
      },
      entitlementId: entitlement.id,
      orderNumber: entitlement.order.orderNumber,
      purchasedAt: entitlement.createdAt,
      licenseType: entitlement.licenseType,
      lastDownloadAt: entitlement.lastDownloadAt,
      downloadCount: entitlement.downloadCount,
    }));

    return NextResponse.json(
      { purchases },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
