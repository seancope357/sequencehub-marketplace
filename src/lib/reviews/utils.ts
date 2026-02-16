/**
 * Review System Utilities
 *
 * Helper functions for the review and rating system
 */

import { db } from '@/lib/db';

/**
 * Calculate the average rating for a product from all approved reviews
 *
 * @param productId - The ID of the product
 * @returns Object containing average rating, review count, and distribution
 */
export async function calculateAverageRating(productId: string): Promise<{
  averageRating: number;
  reviewCount: number;
  ratingDistribution: { [key: string]: number };
}> {
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
      return {
        averageRating: 0,
        reviewCount: 0,
        ratingDistribution: {
          '5': 0,
          '4': 0,
          '3': 0,
          '2': 0,
          '1': 0,
        },
      };
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Math.round((totalRating / reviewCount) * 10) / 10; // Round to 1 decimal

    // Calculate rating distribution
    const distribution: { [key: string]: number } = {
      '5': 0,
      '4': 0,
      '3': 0,
      '2': 0,
      '1': 0,
    };

    reviews.forEach((review) => {
      const ratingKey = review.rating.toString();
      distribution[ratingKey] = (distribution[ratingKey] || 0) + 1;
    });

    return {
      averageRating,
      reviewCount,
      ratingDistribution: distribution,
    };
  } catch (error) {
    console.error('Error calculating average rating:', error);
    throw new Error('Failed to calculate average rating');
  }
}

/**
 * Verify that a user has purchased a product
 *
 * @param userId - The ID of the user
 * @param productId - The ID of the product
 * @returns True if user has an active entitlement, false otherwise
 */
export async function verifyPurchase(
  userId: string,
  productId: string
): Promise<boolean> {
  try {
    const entitlement = await db.entitlement.findFirst({
      where: {
        userId,
        productId,
        isActive: true,
      },
      include: {
        order: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!entitlement) {
      return false;
    }

    // Check that order is completed (not refunded or cancelled)
    if (
      entitlement.order.status === 'REFUNDED' ||
      entitlement.order.status === 'CANCELLED'
    ) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error verifying purchase:', error);
    return false;
  }
}

/**
 * Check if a user can review a product
 *
 * Requirements:
 * - User must have purchased the product (active entitlement)
 * - User must not be the creator of the product
 * - User must not have already reviewed the product
 *
 * @param userId - The ID of the user
 * @param productId - The ID of the product
 * @returns Object with canReview boolean and reason if false
 */
export async function canReviewProduct(
  userId: string,
  productId: string
): Promise<{ canReview: boolean; reason?: string }> {
  try {
    // 1. Check product exists
    const product = await db.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        creatorId: true,
        status: true,
      },
    });

    if (!product) {
      return { canReview: false, reason: 'Product not found' };
    }

    if (product.status !== 'PUBLISHED') {
      return { canReview: false, reason: 'Product is not available for review' };
    }

    // 2. Check user is not the creator
    if (product.creatorId === userId) {
      return { canReview: false, reason: 'You cannot review your own product' };
    }

    // 3. Verify user has purchased the product
    const hasPurchased = await verifyPurchase(userId, productId);
    if (!hasPurchased) {
      return {
        canReview: false,
        reason: 'You must purchase this product before reviewing it',
      };
    }

    // 4. Check if user has already reviewed this product
    const existingReview = await db.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingReview) {
      return {
        canReview: false,
        reason: 'You have already reviewed this product',
      };
    }

    // All checks passed
    return { canReview: true };
  } catch (error) {
    console.error('Error checking if user can review product:', error);
    return { canReview: false, reason: 'Error checking review eligibility' };
  }
}

/**
 * Get the entitlement and order info for a user's purchase
 *
 * @param userId - The ID of the user
 * @param productId - The ID of the product
 * @returns Entitlement with order info, or null if not found
 */
export async function getUserEntitlement(userId: string, productId: string) {
  try {
    return await db.entitlement.findFirst({
      where: {
        userId,
        productId,
        isActive: true,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching entitlement:', error);
    return null;
  }
}

/**
 * Update product rating aggregates in the database
 *
 * This is the main function that should be called after any review
 * create, update, or delete operation.
 *
 * @param productId - The ID of the product
 */
export async function updateProductRatingAggregates(productId: string): Promise<void> {
  try {
    const { averageRating, reviewCount, ratingDistribution } =
      await calculateAverageRating(productId);

    await db.product.update({
      where: { id: productId },
      data: {
        averageRating,
        reviewCount,
        ratingDistribution: JSON.stringify(ratingDistribution),
      },
    });
  } catch (error) {
    console.error('Error updating product rating aggregates:', error);
    // Don't throw - this is a background operation that shouldn't fail the main request
  }
}

/**
 * Get review statistics for a product
 *
 * @param productId - The ID of the product
 * @returns Statistics about the product's reviews
 */
export async function getReviewStatistics(productId: string): Promise<{
  totalReviews: number;
  averageRating: number;
  ratingDistribution: { [key: string]: number };
  percentageByRating: { [key: string]: number };
}> {
  try {
    const { averageRating, reviewCount, ratingDistribution } =
      await calculateAverageRating(productId);

    // Calculate percentages
    const percentageByRating: { [key: string]: number } = {};
    if (reviewCount > 0) {
      for (const rating in ratingDistribution) {
        percentageByRating[rating] =
          Math.round((ratingDistribution[rating] / reviewCount) * 100);
      }
    } else {
      percentageByRating['5'] = 0;
      percentageByRating['4'] = 0;
      percentageByRating['3'] = 0;
      percentageByRating['2'] = 0;
      percentageByRating['1'] = 0;
    }

    return {
      totalReviews: reviewCount,
      averageRating,
      ratingDistribution,
      percentageByRating,
    };
  } catch (error) {
    console.error('Error getting review statistics:', error);
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
      percentageByRating: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
    };
  }
}

/**
 * Check if a user has reviewed a specific product
 *
 * @param userId - The ID of the user
 * @param productId - The ID of the product
 * @returns The review if it exists, null otherwise
 */
export async function getUserReview(userId: string, productId: string) {
  try {
    return await db.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
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
  } catch (error) {
    console.error('Error fetching user review:', error);
    return null;
  }
}
