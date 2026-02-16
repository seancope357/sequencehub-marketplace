import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

/**
 * GET /api/products/[id]/reviews
 * List all reviews for a product
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 50)
 * - sort: Sort order (newest, highest-rated, lowest-rated)
 * - status: Filter by status (optional, admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const sort = searchParams.get('sort') || 'newest';
    const statusFilter = searchParams.get('status');

    // Verify product exists
    const product = await db.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Build where clause
    const whereClause: any = {
      productId,
    };

    // Check if user is authenticated and has special permissions
    const user = await getCurrentUser();
    const isAdmin = user?.roles.includes('ADMIN');
    const isCreator = user && product && (await db.product.findFirst({
      where: { id: productId, creatorId: user.id }
    })) !== null;

    // Status filtering
    if (statusFilter && (isAdmin || isCreator)) {
      // Admin and creator can filter by any status
      whereClause.status = statusFilter;
    } else {
      // Public users only see approved reviews
      whereClause.status = 'APPROVED';
    }

    // Determine sort order
    let orderBy: any;
    switch (sort) {
      case 'highest-rated':
        orderBy = [{ rating: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'lowest-rated':
        orderBy = [{ rating: 'asc' }, { createdAt: 'desc' }];
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Get total count
    const totalCount = await db.review.count({
      where: whereClause,
    });

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Fetch reviews
    const reviews = await db.review.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        responses: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    // Transform reviews for response
    const transformedReviews = reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      status: review.status,
      verifiedPurchase: review.verifiedPurchase,
      helpfulCount: review.helpfulCount,
      unhelpfulCount: review.unhelpfulCount,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: {
        id: review.user.id,
        name: review.user.name || 'Anonymous',
        avatar: review.user.avatar,
      },
      responses: review.responses.map((response) => ({
        id: response.id,
        comment: response.comment,
        isOfficial: response.isOfficial,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
        user: {
          id: response.user.id,
          name: response.user.name || 'Anonymous',
          avatar: response.user.avatar,
        },
      })),
    }));

    // Return paginated results
    return NextResponse.json({
      success: true,
      reviews: transformedReviews,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      meta: {
        sort,
      },
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);

    // Log security alert
    try {
      await db.auditLog.create({
        data: {
          action: 'SECURITY_ALERT',
          entityType: 'review',
          metadata: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            endpoint: '/api/products/[id]/reviews',
          }),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        },
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
