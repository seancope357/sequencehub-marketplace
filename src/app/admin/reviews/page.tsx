'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, XCircle, Flag, EyeOff, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { ReviewStatus } from '@prisma/client';
import { toast } from 'sonner';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  status: ReviewStatus;
  helpfulCount: number;
  unhelpfulCount: number;
  verifiedPurchase: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  product: {
    id: string;
    title: string;
    slug: string;
    creatorId: string;
  };
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [ratingFilter, setRatingFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [page, statusFilter, ratingFilter]);

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (statusFilter) params.append('status', statusFilter);
      if (ratingFilter) params.append('rating', ratingFilter);

      const response = await fetch(`/api/admin/reviews?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.data);
        setTotalPages(data.pagination.totalPages);
      } else {
        toast.error('Failed to load reviews');
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error('Error loading reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (reviewId: string, newStatus: ReviewStatus) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success(`Review ${newStatus.toLowerCase()} successfully`);
        loadReviews();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update review');
      }
    } catch (error) {
      console.error('Error updating review:', error);
      toast.error('Error updating review');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (review: Review) => {
    setSelectedReview(review);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedReview) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/reviews/${selectedReview.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Review deleted successfully');
        setIsDeleteDialogOpen(false);
        loadReviews();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Error deleting review');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: ReviewStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case ReviewStatus.APPROVED:
        return 'default';
      case ReviewStatus.PENDING:
        return 'secondary';
      case ReviewStatus.REJECTED:
        return 'destructive';
      case ReviewStatus.FLAGGED:
        return 'outline';
      case ReviewStatus.HIDDEN:
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${
              i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Review Moderation</h1>
        <p className="text-muted-foreground">Moderate and manage product reviews</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value={ReviewStatus.APPROVED}>Approved</SelectItem>
                <SelectItem value={ReviewStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={ReviewStatus.REJECTED}>Rejected</SelectItem>
                <SelectItem value={ReviewStatus.FLAGGED}>Flagged</SelectItem>
                <SelectItem value={ReviewStatus.HIDDEN}>Hidden</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No reviews found</div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rating</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead>Reviewer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Votes</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell>{renderStars(review.rating)}</TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            {review.title && (
                              <div className="font-medium text-sm mb-1">{review.title}</div>
                            )}
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              {review.comment}
                            </div>
                            {review.verifiedPurchase && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                Verified Purchase
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{review.user.name || 'Unnamed'}</div>
                            <div className="text-xs text-muted-foreground">{review.user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm max-w-xs truncate">{review.product.title}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(review.status)} className="text-xs">
                            {review.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex gap-2">
                            <span className="text-green-600">+{review.helpfulCount}</span>
                            <span className="text-red-600">-{review.unhelpfulCount}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(review.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {review.status !== ReviewStatus.APPROVED && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdateStatus(review.id, ReviewStatus.APPROVED)}
                                disabled={actionLoading}
                                title="Approve"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {review.status !== ReviewStatus.REJECTED && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdateStatus(review.id, ReviewStatus.REJECTED)}
                                disabled={actionLoading}
                                title="Reject"
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                            {review.status !== ReviewStatus.FLAGGED && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdateStatus(review.id, ReviewStatus.FLAGGED)}
                                disabled={actionLoading}
                                title="Flag"
                              >
                                <Flag className="h-4 w-4 text-yellow-600" />
                              </Button>
                            )}
                            {review.status !== ReviewStatus.HIDDEN && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdateStatus(review.id, ReviewStatus.HIDDEN)}
                                disabled={actionLoading}
                                title="Hide"
                              >
                                <EyeOff className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={actionLoading}>
              Delete Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
