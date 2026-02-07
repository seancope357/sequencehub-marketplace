import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { requireCreatorOrAdminUser } from '@/lib/auth/guards';
import { internalServerError } from '@/lib/api/errors';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireCreatorOrAdminUser();
    if (authResult.response) {
      return authResult.response;
    }
    const { user } = authResult;

    // Apply rate limiting: 60 stats queries per hour per user
    const limitResult = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.STATS_QUERY,
      byUser: true,
      byIp: false,
    });

    if (!limitResult.allowed) {
      return limitResult.response;
    }

    const [
      totalProducts,
      totalSales,
      revenueAggregate,
      downloadsAggregate,
    ] = await Promise.all([
      db.product.count({
        where: { creatorId: user.id },
      }),
      db.orderItem.count({
        where: {
          product: {
            creatorId: user.id,
          },
        },
      }),
      db.orderItem.aggregate({
        where: {
          product: {
            creatorId: user.id,
          },
        },
        _sum: {
          priceAtPurchase: true,
        },
      }),
      db.product.aggregate({
        where: { creatorId: user.id },
        _sum: {
          saleCount: true,
        },
      }),
    ]);

    const totalRevenue = revenueAggregate._sum.priceAtPurchase ?? 0;
    const totalDownloads = downloadsAggregate._sum.saleCount ?? 0;

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
    return internalServerError();
  }
}
