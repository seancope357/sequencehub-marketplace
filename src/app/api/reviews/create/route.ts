import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { updateProductRatingAggregates } from '@/lib/reviews/utils';

// Validation schema
const createReviewSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  title: z.string().max(100, 'Title must be 100 characters or less').optional(),
  comment: z.string()
    .min(50, 'Comment must be at least 50 characters')
    .max(2000, 'Comment must be 2000 characters or less'),
});

/**
 * POST /api/reviews/create
 * Create a new review for a product
 *
 * Requirements:
 * - User must be authenticated
 * - User must have active entitlement (verified purchase)
 * - User cannot review their own product
 * - One review per user per product
 * - Rate limit: 5 reviews per hour
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Rate limiting (5 reviews per hour)
    const limitResult = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.REVIEW_CREATE,
      byUser: true,
      byIp: false,
      message: 'Too many reviews. Please try again later.',
    });

    if (!limitResult.allowed) {
      return limitResult.response;
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const validation = createReviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { productId, rating, title, comment } = validation.data;

    // 4. Check product exists and is published
    const product = await db.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        title: true,
        status: true,
        creatorId: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (product.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Product is not available for review' },
        { status: 400 }
      );
    }

    // 5. Check user is not the creator (cannot review own product)
    if (product.creatorId === user.id) {
      return NextResponse.json(
        { error: 'You cannot review your own product' },
        { status: 403 }
      );
    }

    // 6. Check user has active entitlement (verified purchase)
    const entitlement = await db.entitlement.findFirst({
      where: {
        userId: user.id,
        productId: productId,
        isActive: true,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
      },
    });

    if (!entitlement) {
      return NextResponse.json(
        { error: 'You must purchase this product before reviewing it' },
        { status: 403 }
      );
    }

    if (entitlement.order.status === 'REFUNDED' || entitlement.order.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot review a refunded or cancelled order' },
        { status: 403 }
      );
    }

    // 7. Check if user already reviewed this product
    const existingReview = await db.review.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId: productId,
        },
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this product. Use PATCH to update your review.' },
        { status: 409 }
      );
    }

    // 8. Create review
    const review = await db.review.create({
      data: {
        productId,
        userId: user.id,
        orderId: entitlement.order.id,
        entitlementId: entitlement.id,
        rating,
        title: title || null,
        comment,
        status: 'APPROVED', // Auto-approve per user preferences
        verifiedPurchase: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // 9. Update product rating aggregates
    await updateProductRatingAggregates(productId);

    // 10. Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'REVIEW_CREATED',
        entityType: 'review',
        entityId: review.id,
        metadata: JSON.stringify({
          productId,
          rating,
          hasTitle: !!title,
          commentLength: comment.length,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    // 11. Return created review
    return NextResponse.json({
      success: true,
      review: {
        id: review.id,
        productId: review.productId,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        status: review.status,
        verifiedPurchase: review.verifiedPurchase,
        createdAt: review.createdAt,
        user: {
          id: review.user.id,
          name: review.user.name || 'Anonymous',
          avatar: review.user.avatar,
        },
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating review:', error);

    // Log security alert
    try {
      await db.auditLog.create({
        data: {
          action: 'SECURITY_ALERT',
          entityType: 'review',
          metadata: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            endpoint: '/api/reviews/create',
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

