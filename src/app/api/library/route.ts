import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
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
        product: {
          include: {
            versions: {
              where: { isLatest: true },
              take: 1,
            },
          },
        },
        order: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform data
    const purchases = entitlements.map((entitlement) => ({
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
      version: entitlement.product.versions[0]
        ? {
            id: entitlement.product.versions[0].id,
            versionNumber: entitlement.product.versions[0].versionNumber,
            versionName: entitlement.product.versions[0].versionName,
            publishedAt: entitlement.product.versions[0].publishedAt?.toISOString() || '',
          }
        : null,
      price: entitlement.order.totalAmount / entitlement.order.items.length, // Approximate price per item
      purchasedAt: entitlement.createdAt.toISOString(),
    }));

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
