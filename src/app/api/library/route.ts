import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
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
        product: true,
        version: true,
        order: {
          include: {
            items: {
              select: {
                productId: true,
                priceAtPurchase: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform data
    const purchases = entitlements.map((entitlement) => {
      const matchingOrderItem = entitlement.order.items.find(
        (item) => item.productId === entitlement.productId,
      );

      return {
        id: entitlement.id,
        orderNumber: entitlement.order.orderNumber,
        product: {
          id: entitlement.product.id,
          slug: entitlement.product.slug,
          title: entitlement.product.title,
          category: entitlement.product.category,
          description: entitlement.product.description,
          includesFSEQ: entitlement.product.includesFSEQ,
          includesSource: entitlement.product.includesSource,
        },
        version: entitlement.version
          ? {
              id: entitlement.version.id,
              versionNumber: entitlement.version.versionNumber,
              versionName: entitlement.version.versionName,
              publishedAt: entitlement.version.publishedAt?.toISOString() || '',
            }
          : null,
        price: matchingOrderItem?.priceAtPurchase ?? entitlement.order.totalAmount,
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
