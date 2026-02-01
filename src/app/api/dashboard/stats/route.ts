import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
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

    // Apply rate limiting: 60 stats queries per hour per user
    const limitResult = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.STATS_QUERY,
      byUser: true,
      byIp: false,
    });

    if (!limitResult.allowed) {
      return limitResult.response;
    }

    // Get user's products
    const products = await db.product.findMany({
      where: { creatorId: user.id },
      select: {
        id: true,
        saleCount: true,
      },
    });

    // Get user's orders (sales)
    const orderItems = await db.orderItem.findMany({
      where: {
        product: {
          creatorId: user.id,
        },
      },
      include: {
        order: true,
      },
    });

    // Calculate stats
    const totalProducts = products.length;
    const totalSales = orderItems.length;
    const totalRevenue = orderItems.reduce((sum, item) => sum + item.priceAtPurchase, 0);
    const totalDownloads = products.reduce((sum, product) => sum + product.saleCount, 0);

    return NextResponse.json(
      {
        totalProducts,
        totalSales,
        totalRevenue,
        totalDownloads,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
