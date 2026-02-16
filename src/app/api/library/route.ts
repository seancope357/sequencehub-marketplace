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

    // Get user's entitlements (purchases)
    const entitlements = await db.entitlement.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch related products with their latest versions
    const productIds = [...new Set(entitlements.map(e => e.productId))];
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      include: {
        versions: {
          where: { isLatest: true },
          take: 1,
        },
      },
    });

    // Create product lookup map
    const productMap = new Map(products.map(p => [p.id, p]));

    // Transform data
    const purchases = entitlements.map((entitlement) => {
      const product = productMap.get(entitlement.productId);

      return {
        id: entitlement.id,
        orderNumber: entitlement.order.orderNumber,
        product: product ? {
          id: product.id,
          slug: product.slug,
          title: product.title,
          category: product.category,
          description: product.description,
          includesFSEQ: product.includesFSEQ,
          includesSource: product.includesSource,
        } : null,
        version: product && product.versions[0]
          ? {
              id: product.versions[0].id,
              versionNumber: product.versions[0].versionNumber,
              versionName: product.versions[0].versionName,
              publishedAt: product.versions[0].publishedAt?.toISOString() || '',
            }
          : null,
        price: entitlement.order.items.length > 0
          ? entitlement.order.totalAmount / entitlement.order.items.length
          : entitlement.order.totalAmount, // Approximate price per item
        purchasedAt: entitlement.createdAt.toISOString(),
      };
    });

    return NextResponse.json(
      { purchases },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching library:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
