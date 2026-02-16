'use client';

/**
 * ReviewsExample Component
 *
 * This is a comprehensive example showing how to use all the review components together.
 * Use this as a reference for integrating reviews into product pages.
 */

import { useState } from 'react';
import { StarRating } from './StarRating';
import { ReviewForm } from './ReviewForm';
import { ReviewList } from './ReviewList';
import { ReviewsSummary } from './ReviewsSummary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ReviewsExampleProps {
  productId: string;
  currentUserId?: string;
  userHasPurchased?: boolean;
  userHasReviewed?: boolean;
}

export function ReviewsExample({
  productId,
  currentUserId,
  userHasPurchased = false,
  userHasReviewed = false,
}: ReviewsExampleProps) {
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Example data - in a real app, this would come from your API
  const averageRating = 4.5;
  const reviewCount = 42;
  const ratingDistribution = {
    5: 25,
    4: 12,
    3: 3,
    2: 1,
    1: 1,
  };

  return (
    <div className="space-y-8">
      {/* Reviews Summary Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Customer Reviews</h2>
        <ReviewsSummary
          productId={productId}
          averageRating={averageRating}
          reviewCount={reviewCount}
          ratingDistribution={ratingDistribution}
          canReview={userHasPurchased && !userHasReviewed}
          onWriteReview={() => setShowReviewForm(true)}
        />
      </section>

      <Separator />

      {/* Review Form Section */}
      {showReviewForm && userHasPurchased && !userHasReviewed && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Write a Review</CardTitle>
            </CardHeader>
            <CardContent>
              <ReviewForm
                productId={productId}
                onSuccess={() => {
                  setShowReviewForm(false);
                  // Refresh review list
                }}
                onCancel={() => setShowReviewForm(false)}
              />
            </CardContent>
          </Card>
        </section>
      )}

      {/* Reviews List Section */}
      <section>
        <ReviewList productId={productId} currentUserId={currentUserId} />
      </section>

      {/* Standalone Examples (for documentation) */}
      <section className="border-t pt-8 mt-8">
        <h3 className="text-xl font-bold mb-4">Component Examples</h3>

        {/* StarRating Examples */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>StarRating Component</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Read-only (Display Mode)</p>
              <div className="flex gap-4 items-center">
                <StarRating rating={5} size="sm" readonly />
                <StarRating rating={4.5} size="md" readonly showCount />
                <StarRating rating={3.7} size="lg" readonly showCount />
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground mb-2">Interactive (Input Mode)</p>
              <StarRating
                rating={0}
                onChange={(rating) => console.log('Rating selected:', rating)}
                size="lg"
                readonly={false}
              />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

/**
 * Usage Examples:
 *
 * 1. Basic Product Page Integration:
 * ```tsx
 * <ReviewsExample
 *   productId="product-123"
 *   currentUserId={user?.id}
 *   userHasPurchased={true}
 *   userHasReviewed={false}
 * />
 * ```
 *
 * 2. Individual Component Usage:
 *
 * Star Rating Display:
 * ```tsx
 * <StarRating rating={4.5} size="md" readonly showCount />
 * ```
 *
 * Star Rating Input:
 * ```tsx
 * <StarRating
 *   rating={userRating}
 *   onChange={setUserRating}
 *   size="lg"
 * />
 * ```
 *
 * Review Form:
 * ```tsx
 * <ReviewForm
 *   productId="product-123"
 *   onSuccess={() => console.log('Review submitted!')}
 * />
 * ```
 *
 * Reviews List:
 * ```tsx
 * <ReviewList
 *   productId="product-123"
 *   currentUserId={user?.id}
 * />
 * ```
 *
 * Reviews Summary:
 * ```tsx
 * <ReviewsSummary
 *   productId="product-123"
 *   averageRating={4.5}
 *   reviewCount={42}
 *   ratingDistribution={{ 5: 25, 4: 12, 3: 3, 2: 1, 1: 1 }}
 *   canReview={true}
 *   onWriteReview={() => console.log('Write review clicked')}
 * />
 * ```
 */
