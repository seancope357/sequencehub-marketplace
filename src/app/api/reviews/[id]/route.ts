import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

// Validation schema for PATCH
const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5').optional(),
  title: z.string().max(100, 'Title must be 100 characters or less').optional().nullable(),
  comment: z.string()
    .min(50, 'Comment must be at least 50 characters')
    .max(2000, 'Comment must be 2000 characters or less')
    .optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED', 'HIDDEN']).optional(),
});

/**
 * PATCH /api/reviews/[id]
 * Edit an existing review
 *
 * Requirements:
 * - User must be authenticated
 * - User must own the review
 * - Can edit rating, title, and/or comment
 * - Product rating aggregates are recalculated
 * - Rate limit: 10 updates per hour
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewId } = await params;

    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Rate limiting (10 updates per hour)
    const limitResult = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.REVIEW_UPDATE,
      byUser: true,
      byIp: false,
      message: 'Too many review updates. Please try again later.',
    });

    if (!limitResult.allowed) {
      return limitResult.response;
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const validation = updateReviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // 4. Fetch the review and verify ownership
    const review = await db.review.findUnique({
      where: { id: reviewId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // 5. Verify user owns this review (or is admin for status changes)
    const isAdmin = user.roles.includes('ADMIN');
    const isOwner = review.userId === user.id;

    // Allow admins to change status only, not content
    if (updateData.status && !isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can change review status' },
        { status: 403 }
      );
    }

    // Regular users can only edit their own reviews
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only edit your own reviews' },
        { status: 403 }
      );
    }

    // Owners cannot edit status, only content
    if (updateData.status && !isAdmin) {
      return NextResponse.json(
        { error: 'You cannot change review status' },
        { status: 403 }
      );
    }

    // 6. Update the review
    const updatedReview = await db.review.update({
      where: { id: reviewId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // 7. If rating changed, recalculate product rating aggregates
    if (updateData.rating !== undefined) {
      await updateProductRatingAggregates(review.product.id);
    }

    // 8. Create audit log
    const auditAction = updateData.status === 'APPROVED' ? 'REVIEW_APPROVED' :
                       updateData.status === 'REJECTED' ? 'REVIEW_REJECTED' :
                       updateData.status === 'FLAGGED' ? 'REVIEW_FLAGGED' :
                       updateData.status === 'HIDDEN' ? 'REVIEW_HIDDEN' :
                       'REVIEW_UPDATED';

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: auditAction,
        entityType: 'review',
        entityId: reviewId,
        changes: JSON.stringify(updateData),
        metadata: JSON.stringify({
          productId: review.product.id,
          oldRating: review.rating,
          newRating: updateData.rating || review.rating,
          oldStatus: review.status,
          newStatus: updateData.status || review.status,
          updatedBy: isAdmin ? 'admin' : 'owner',
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    // 9. Return updated review
    return NextResponse.json({
      success: true,
      review: {
        id: updatedReview.id,
        productId: updatedReview.productId,
        rating: updatedReview.rating,
        title: updatedReview.title,
        comment: updatedReview.comment,
        status: updatedReview.status,
        verifiedPurchase: updatedReview.verifiedPurchase,
        helpfulCount: updatedReview.helpfulCount,
        unhelpfulCount: updatedReview.unhelpfulCount,
        createdAt: updatedReview.createdAt,
        updatedAt: updatedReview.updatedAt,
        user: {
          id: updatedReview.user.id,
          name: updatedReview.user.name || 'Anonymous',
          avatar: updatedReview.user.avatar,
        },
      },
    });

  } catch (error) {
    console.error('Error updating review:', error);

    // Log security alert
    try {
      await db.auditLog.create({
        data: {
          action: 'SECURITY_ALERT',
          entityType: 'review',
          metadata: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            endpoint: '/api/reviews/[id] PATCH',
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

/**
 * DELETE /api/reviews/[id]
 * Delete a review
 *
 * Requirements:
 * - User must be authenticated
 * - User must own the review OR be an ADMIN
 * - Review is hard deleted (not soft delete)
 * - Product rating aggregates are recalculated
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewId } = await params;

    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Fetch the review
    const review = await db.review.findUnique({
      where: { id: reviewId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // 3. Verify user owns this review OR is admin
    const isAdmin = user.roles.includes('ADMIN');
    const isOwner = review.userId === user.id;

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only delete your own reviews' },
        { status: 403 }
      );
    }

    // 4. Store product ID before deletion for aggregate recalculation
    const productId = review.product.id;

    // 5. Delete the review (cascade deletes votes and responses)
    await db.review.delete({
      where: { id: reviewId },
    });

    // 6. Recalculate product rating aggregates
    await updateProductRatingAggregates(productId);

    // 7. Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'REVIEW_DELETED',
        entityType: 'review',
        entityId: reviewId,
        metadata: JSON.stringify({
          productId,
          rating: review.rating,
          deletedBy: isAdmin ? 'admin' : 'owner',
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    // 8. Return success
    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting review:', error);

    // Log security alert
    try {
      await db.auditLog.create({
        data: {
          action: 'SECURITY_ALERT',
          entityType: 'review',
          metadata: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            endpoint: '/api/reviews/[id] DELETE',
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

/**
 * Update product rating aggregates
 * Calculates average rating, review count, and rating distribution
 */
async function updateProductRatingAggregates(productId: string) {
  try {
    // Get all approved reviews for this product
    const reviews = await db.review.findMany({
      where: {
        productId,
        status: 'APPROVED',
      },
      select: {
        rating: true,
      },
    });

    const reviewCount = reviews.length;

    if (reviewCount === 0) {
      // No reviews, set to defaults
      await db.product.update({
        where: { id: productId },
        data: {
          averageRating: 0,
          reviewCount: 0,
          ratingDistribution: null,
        },
      });
      return;
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviewCount;

    // Calculate rating distribution
    const distribution = {
      '5': 0,
      '4': 0,
      '3': 0,
      '2': 0,
      '1': 0,
    };

    reviews.forEach((review) => {
      distribution[review.rating.toString() as keyof typeof distribution]++;
    });

    // Update product
    await db.product.update({
      where: { id: productId },
      data: {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        reviewCount,
        ratingDistribution: JSON.stringify(distribution),
      },
    });

  } catch (error) {
    console.error('Error updating product rating aggregates:', error);
    // Don't throw - this is a background operation
  }
}
