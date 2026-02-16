import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { db } from '@/lib/db';
import { ProductStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status as ProductStatus;
    }

    if (category) {
      where.category = category;
    }

    // Get products with pagination
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          prices: {
            where: { isActive: true },
            take: 1,
          },
          media: {
            where: { mediaType: 'cover' },
            take: 1,
          },
          _count: {
            select: {
              versions: true,
              reviews: true,
              orderItems: true,
            },
          },
        },
      }),
      db.product.count({ where }),
    ]);

    const formattedProducts = products.map((product) => ({
      ...product,
      price: product.prices[0]?.amount || 0,
      coverImage: product.media[0]?.storageKey || null,
      stats: {
        versions: product._count.versions,
        reviews: product._count.reviews,
        sales: product._count.orderItems,
      },
    }));

    return NextResponse.json({
      success: true,
      data: formattedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin products list error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
