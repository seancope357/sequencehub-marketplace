'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { StarRating } from './StarRating';
import { ReviewForm, Review } from './ReviewForm';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, ThumbsUp, Edit2, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ReviewWithUser extends Review {
  user: {
    id: string;
    name: string;
    email: string;
  };
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
  hasVoted?: boolean;
}

interface ReviewListProps {
  productId: string;
  currentUserId?: string;
}

type SortOption = 'recent' | 'highest' | 'lowest';

const REVIEWS_PER_PAGE = 10;

export function ReviewList({ productId, currentUserId }: ReviewListProps) {
  const [reviews, setReviews] = useState<ReviewWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/products/${productId}/reviews?page=${currentPage}&limit=${REVIEWS_PER_PAGE}&sort=${sortBy}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();
      setReviews(data.reviews || []);
      setTotalPages(Math.ceil((data.total || 0) / REVIEWS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reviews',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId, currentPage, sortBy]);

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }

    setDeletingReviewId(reviewId);

    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete review');
      }

      toast({
        title: 'Review Deleted',
        description: 'Your review has been deleted successfully.',
      });

      fetchReviews();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete review',
        variant: 'destructive',
      });
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleHelpful = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to vote');
      }

      fetchReviews();
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit vote',
        variant: 'destructive',
      });
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          No reviews yet. Be the first to review!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sort Dropdown */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {reviews.length > 0 && `${reviews.length} Review${reviews.length !== 1 ? 's' : ''}`}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="highest">Highest Rated</SelectItem>
              <SelectItem value="lowest">Lowest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Review Cards */}
      <div className="space-y-4">
        {reviews.map((review) => {
          const isOwnReview = currentUserId && review.user.id === currentUserId;
          const isEditing = editingReviewId === review.id;

          return (
            <Card
              key={review.id}
              className={cn(
                'transition-shadow hover:shadow-md',
                isOwnReview && 'border-primary/50'
              )}
            >
              <CardContent className="pt-6">
                {isEditing ? (
                  <ReviewForm
                    productId={productId}
                    existingReview={review}
                    onSuccess={() => {
                      setEditingReviewId(null);
                      fetchReviews();
                    }}
                    onCancel={() => setEditingReviewId(null)}
                  />
                ) : (
                  <div className="space-y-4">
                    {/* User Info & Rating */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Avatar>
                          <AvatarImage src="" alt={review.user.name} />
                          <AvatarFallback>{getUserInitials(review.user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{review.user.name}</span>
                            {review.verifiedPurchase && (
                              <Badge variant="secondary" className="gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Verified Purchase
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <StarRating rating={review.rating} size="sm" readonly />
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(review.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Edit/Delete Buttons */}
                      {isOwnReview && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingReviewId(review.id)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(review.id)}
                            disabled={deletingReviewId === review.id}
                          >
                            {deletingReviewId === review.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Review Content */}
                    <div className="space-y-2">
                      {review.title && (
                        <h4 className="font-semibold text-base">{review.title}</h4>
                      )}
                      {review.comment && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {review.comment}
                        </p>
                      )}
                    </div>

                    {/* Helpful Button */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleHelpful(review.id)}
                        disabled={review.hasVoted || !currentUserId}
                        className="gap-2"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>Helpful</span>
                        {review.helpfulCount > 0 && (
                          <span className="text-muted-foreground">({review.helpfulCount})</span>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className={cn(
                  currentPage === 1 && 'pointer-events-none opacity-50'
                )}
              />
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className={cn(
                  currentPage === totalPages && 'pointer-events-none opacity-50'
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
