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
        order: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch related products and versions
    const productIds = [...new Set(entitlements.map(e => e.productId))];
    const versionIds = [...new Set(entitlements.map(e => e.versionId))];

    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      include: {
        media: {
          where: { mediaType: 'cover' },
          take: 1,
        },
      },
    });

    const versions = await db.productVersion.findMany({
      where: { id: { in: versionIds } },
    });

    // Create lookup maps
    const productMap = new Map(products.map(p => [p.id, p]));
    const versionMap = new Map(versions.map(v => [v.id, v]));

    const purchases = entitlements.map((entitlement) => {
      const product = productMap.get(entitlement.productId);
      const version = versionMap.get(entitlement.versionId);

      return {
        id: entitlement.id,
        product: product ? {
          id: product.id,
          slug: product.slug,
          title: product.title,
          category: product.category,
          media: product.media[0] || undefined,
        } : null,
        version: version ? {
          id: version.id,
          versionNumber: version.versionNumber,
          versionName: version.versionName,
          publishedAt: version.publishedAt,
        } : null,
        entitlementId: entitlement.id,
        orderNumber: entitlement.order.orderNumber,
        purchasedAt: entitlement.createdAt,
        licenseType: entitlement.licenseType,
        lastDownloadAt: entitlement.lastDownloadAt,
        downloadCount: entitlement.downloadCount,
      };
    });

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
