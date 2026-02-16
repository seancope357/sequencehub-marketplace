'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StarRating } from './StarRating';
import { cn } from '@/lib/utils';

export interface ReviewsSummaryProps {
  productId: string;
  averageRating: number;
  reviewCount: number;
  ratingDistribution?: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  canReview?: boolean;
  onWriteReview?: () => void;
  className?: string;
}

export function ReviewsSummary({
  averageRating,
  reviewCount,
  ratingDistribution,
  canReview = false,
  onWriteReview,
  className,
}: ReviewsSummaryProps) {
  const totalRatings = ratingDistribution
    ? Object.values(ratingDistribution).reduce((sum, count) => sum + count, 0)
    : reviewCount;

  const getRatingPercentage = (starCount: number): number => {
    if (!ratingDistribution || totalRatings === 0) return 0;
    const count = ratingDistribution[starCount as keyof typeof ratingDistribution] || 0;
    return (count / totalRatings) * 100;
  };

  const getRatingCount = (starCount: number): number => {
    if (!ratingDistribution) return 0;
    return ratingDistribution[starCount as keyof typeof ratingDistribution] || 0;
  };

  return (
    <Card className={cn('', className)}>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Overall Rating */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex flex-col items-center sm:items-start gap-2">
              <div className="text-5xl font-bold">{averageRating.toFixed(1)}</div>
              <StarRating rating={averageRating} size="md" readonly showCount={false} />
              <p className="text-sm text-muted-foreground">
                Based on {reviewCount} review{reviewCount !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Write Review Button */}
            {canReview && onWriteReview && (
              <Button onClick={onWriteReview} className="sm:ml-auto">
                Write a Review
              </Button>
            )}
          </div>

          {/* Rating Distribution */}
          {ratingDistribution && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Rating Breakdown</h4>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const percentage = getRatingPercentage(stars);
                  const count = getRatingCount(stars);

                  return (
                    <div key={stars} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 min-w-[60px]">
                        <span className="text-sm font-medium">{stars}</span>
                        <span className="text-yellow-500">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="inline-block"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </span>
                      </div>
                      <div className="flex-1">
                        <Progress value={percentage} className="h-2" />
                      </div>
                      <div className="min-w-[60px] text-right">
                        <span className="text-sm text-muted-foreground">
                          {percentage.toFixed(0)}%
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({count})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Reviews Message */}
          {reviewCount === 0 && (
            <div className="text-center py-6">
              <p className="text-muted-foreground">
                No reviews yet. {canReview && 'Be the first to review this product!'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
