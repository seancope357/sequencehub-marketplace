import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ProductStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sortBy = searchParams.get('sortBy') || 'popular';
    const search = searchParams.get('search');

    const where: any = {
      status: ProductStatus.PUBLISHED,
    };

    if (category && category !== 'all') {
      where.category = category;
    }

    if (minPrice) {
      where.prices = {
        some: {
          amount: { gte: parseFloat(minPrice) },
        },
      };
    }

    if (maxPrice) {
      if (!where.prices) {
        where.prices = {};
      }
      where.prices.some = {
        ...(where.prices.some || {}),
        amount: { lte: parseFloat(maxPrice) },
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = {};

    switch (sortBy) {
      case 'popular':
        orderBy = { saleCount: 'desc' as const };
        break;
      case 'recent':
        orderBy = { createdAt: 'desc' as const };
        break;
      case 'price-low':
        // Will sort in memory after fetching
        break;
      case 'price-high':
        // Will sort in memory after fetching
        break;
      default:
        orderBy = { saleCount: 'desc' as const };
    }

    const products = await db.product.findMany({
      where,
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
          where: { mediaType: 'cover' },
          take: 1,
        },
      },
      orderBy,
    });

    // Transform data
    const transformedProducts = products.map((product) => ({
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
      creator: product.creator,
      media: product.media[0] || undefined,
      saleCount: product.saleCount,
    }));

    // Apply in-memory sorting for price-based sorts
    if (sortBy === 'price-low') {
      transformedProducts.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      transformedProducts.sort((a, b) => b.price - a.price);
    }

    return NextResponse.json(
      {
        products: transformedProducts,
        total: transformedProducts.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
