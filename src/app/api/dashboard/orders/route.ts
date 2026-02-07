import { NextRequest, NextResponse } from 'next/server';
import { OrderStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { requireCreatorOrAdminUser } from '@/lib/auth/guards';
import { badRequestError, internalServerError } from '@/lib/api/errors';

const ALLOWED_STATUSES: OrderStatus[] = [
  'PENDING',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
];

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireCreatorOrAdminUser();
    if (authResult.response) {
      return authResult.response;
    }
    const { user } = authResult;

    const limitResult = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.STATS_QUERY,
      byUser: true,
      byIp: false,
      message: 'Orders query rate limit exceeded. Please try again later.',
    });
    if (!limitResult.allowed) {
      return limitResult.response;
    }

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Number.parseInt(searchParams.get('pageSize') || '25', 10);
    const status = searchParams.get('status');

    const normalizedPage = Number.isNaN(page) || page < 1 ? 1 : page;
    const normalizedPageSize = Number.isNaN(pageSize)
      ? 25
      : Math.min(Math.max(pageSize, 1), 100);

    if (status && !ALLOWED_STATUSES.includes(status as OrderStatus)) {
      return badRequestError('Invalid order status filter');
    }

    const where = {
      product: {
        creatorId: user.id,
      },
      ...(status ? { order: { status: status as OrderStatus } } : {}),
    };

    const [total, items] = await Promise.all([
      db.orderItem.count({ where }),
      db.orderItem.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              totalAmount: true,
              currency: true,
              createdAt: true,
              userId: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (normalizedPage - 1) * normalizedPageSize,
        take: normalizedPageSize,
      }),
    ]);

    return NextResponse.json({
      orders: items.map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        lineAmount: item.priceAtPurchase,
        currency: item.currency,
        product: item.product,
        order: {
          id: item.order.id,
          orderNumber: item.order.orderNumber,
          status: item.order.status,
          totalAmount: item.order.totalAmount,
          currency: item.order.currency,
          createdAt: item.order.createdAt,
          buyerId: item.order.userId,
        },
      })),
      pagination: {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / normalizedPageSize)),
      },
      filters: {
        status: status || null,
      },
    });
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    return internalServerError();
  }
}
