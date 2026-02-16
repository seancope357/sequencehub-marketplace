# Reviews & Ratings API - Quick Reference

**Last Updated:** February 16, 2026

## Quick Start

### Import Helper Functions
```typescript
import {
  canReviewProduct,
  verifyPurchase,
  calculateAverageRating,
  updateProductRatingAggregates,
  getReviewStatistics,
  getUserReview
} from '@/lib/reviews/utils';
```

## API Endpoints

### 1. Create Review
```typescript
POST /api/reviews/create

// Request
{
  "productId": "clxxxxx",
  "rating": 5,
  "title": "Amazing sequence!",  // optional
  "comment": "This is exactly what I needed..."
}

// Response (201 Created)
{
  "success": true,
  "review": {
    "id": "clxxxxx",
    "productId": "clxxxxx",
    "rating": 5,
    "title": "Amazing sequence!",
    "comment": "This is exactly...",
    "status": "APPROVED",
    "verifiedPurchase": true,
    "createdAt": "2026-02-16T...",
    "user": {
      "id": "clxxxxx",
      "name": "John Doe",
      "avatar": "..."
    }
  }
}

// Errors
401 - Not authenticated
403 - Cannot review own product / Must purchase first / Already reviewed
400 - Invalid data (rating not 1-5, comment too short/long)
429 - Rate limit exceeded (5 reviews per hour)
```

### 2. List Reviews
```typescript
GET /api/products/{productId}/reviews?page=1&limit=10&sort=newest

// Query Params
page: number (default: 1)
limit: number (default: 10, max: 50)
sort: 'newest' | 'highest-rated' | 'lowest-rated'
status: 'APPROVED' | 'PENDING' | 'REJECTED' (admin/creator only)

// Response (200 OK)
{
  "success": true,
  "reviews": [
    {
      "id": "clxxxxx",
      "rating": 5,
      "title": "Amazing!",
      "comment": "Great product...",
      "status": "APPROVED",
      "verifiedPurchase": true,
      "helpfulCount": 10,
      "unhelpfulCount": 1,
      "createdAt": "2026-02-16T...",
      "updatedAt": "2026-02-16T...",
      "user": {
        "id": "clxxxxx",
        "name": "John Doe",
        "avatar": "..."
      },
      "responses": []  // Creator responses
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalCount": 25,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "meta": {
    "sort": "newest"
  }
}

// Errors
404 - Product not found
```

### 3. Edit Review
```typescript
PATCH /api/reviews/{reviewId}

// Request (all fields optional, but at least one required)
{
  "rating": 4,
  "title": "Updated title",
  "comment": "Updated comment..."
}

// Response (200 OK)
{
  "success": true,
  "review": { ... }  // Updated review object
}

// Errors
401 - Not authenticated
403 - Can only edit your own reviews
404 - Review not found
400 - No fields to update / Invalid data
429 - Rate limit exceeded (10 updates per hour)
```

### 4. Delete Review
```typescript
DELETE /api/reviews/{reviewId}

// No request body

// Response (200 OK)
{
  "success": true,
  "message": "Review deleted successfully"
}

// Errors
401 - Not authenticated
403 - Can only delete your own reviews (unless admin)
404 - Review not found
```

## Helper Functions

### Check If User Can Review
```typescript
const { canReview, reason } = await canReviewProduct(userId, productId);

if (!canReview) {
  console.log(reason);
  // "You must purchase this product before reviewing it"
  // "You have already reviewed this product"
  // "You cannot review your own product"
  // "Product not found"
  // "Product is not available for review"
}
```

### Verify Purchase
```typescript
const hasPurchased = await verifyPurchase(userId, productId);
// Returns true if user has active entitlement with completed order
```

### Calculate Rating Statistics
```typescript
const stats = await getReviewStatistics(productId);
// {
//   totalReviews: 25,
//   averageRating: 4.6,
//   ratingDistribution: { '5': 15, '4': 8, '3': 2, '2': 0, '1': 0 },
//   percentageByRating: { '5': 60, '4': 32, '3': 8, '2': 0, '1': 0 }
// }
```

### Get User's Review
```typescript
const review = await getUserReview(userId, productId);
// Returns review object or null
```

### Update Product Aggregates
```typescript
// Call after any review operation
await updateProductRatingAggregates(productId);
// Updates product.averageRating, product.reviewCount, product.ratingDistribution
```

## Frontend Components Examples

### Product Page - Display Reviews
```typescript
'use client';

import { useState, useEffect } from 'react';

export function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    async function fetchReviews() {
      const res = await fetch(
        `/api/products/${productId}/reviews?page=${page}&limit=10&sort=${sort}`
      );
      const data = await res.json();
      setReviews(data.reviews);
      setLoading(false);
    }
    fetchReviews();
  }, [productId, page, sort]);

  if (loading) return <div>Loading reviews...</div>;

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2>Customer Reviews</h2>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="highest-rated">Highest Rated</option>
          <option value="lowest-rated">Lowest Rated</option>
        </select>
      </div>

      {reviews.map((review) => (
        <div key={review.id} className="border-b py-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  filled={i < review.rating}
                />
              ))}
            </div>
            <span className="font-semibold">{review.user.name}</span>
            {review.verifiedPurchase && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Verified Purchase
              </span>
            )}
          </div>

          {review.title && (
            <h3 className="font-semibold mb-1">{review.title}</h3>
          )}

          <p className="text-gray-700 mb-2">{review.comment}</p>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{new Date(review.createdAt).toLocaleDateString()}</span>
            <button>Helpful ({review.helpfulCount})</button>
            <button>Report</button>
          </div>

          {review.responses.length > 0 && (
            <div className="mt-3 ml-8 bg-gray-50 p-3 rounded">
              <div className="text-sm font-semibold mb-1">
                Creator Response:
              </div>
              <p className="text-sm">{review.responses[0].comment}</p>
            </div>
          )}
        </div>
      ))}

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-4">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button onClick={() => setPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
```

### Review Form
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReviewForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/reviews/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rating,
          title: title || undefined,
          comment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      // Success - refresh page or show success message
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold">Write a Review</h2>

      {/* Rating Stars */}
      <div>
        <label className="block mb-2">Rating *</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={rating >= star ? 'text-yellow-400' : 'text-gray-300'}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block mb-2">Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          className="w-full border rounded px-3 py-2"
          placeholder="What's most important to know?"
        />
      </div>

      {/* Comment */}
      <div>
        <label className="block mb-2">Review *</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          minLength={50}
          maxLength={2000}
          rows={5}
          className="w-full border rounded px-3 py-2"
          placeholder="What did you like or dislike about this sequence? (minimum 50 characters)"
          required
        />
        <div className="text-sm text-gray-500 mt-1">
          {comment.length} / 2000 characters (minimum 50)
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 p-3 rounded">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || rating === 0 || comment.length < 50}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300"
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
```

### Rating Display Component
```typescript
export function RatingDisplay({
  productId
}: {
  productId: string
}) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Fetch from product data or calculate
    async function fetchStats() {
      const res = await fetch(`/api/products/${productId}`);
      const { product } = await res.json();
      setStats({
        averageRating: product.averageRating,
        reviewCount: product.reviewCount,
        distribution: JSON.parse(product.ratingDistribution || '{}')
      });
    }
    fetchStats();
  }, [productId]);

  if (!stats) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-4xl font-bold">
          {stats.averageRating.toFixed(1)}
        </span>
        <div>
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star key={i} filled={i < Math.round(stats.averageRating)} />
            ))}
          </div>
          <div className="text-sm text-gray-600">
            {stats.reviewCount} reviews
          </div>
        </div>
      </div>

      {/* Distribution bars */}
      <div className="space-y-1">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = stats.distribution[rating] || 0;
          const percentage = (count / stats.reviewCount) * 100;

          return (
            <div key={rating} className="flex items-center gap-2">
              <span className="text-sm w-8">{rating} ★</span>
              <div className="flex-1 bg-gray-200 h-2 rounded">
                <div
                  className="bg-yellow-400 h-2 rounded"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm w-12 text-right">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Create Review | 5 requests | 1 hour |
| Edit Review | 10 requests | 1 hour |
| Vote on Review | 20 requests | 1 hour |
| Moderate Review | 50 requests | 1 hour |

## Common Patterns

### Check Review Eligibility Before Showing Form
```typescript
async function checkCanReview(userId: string, productId: string) {
  const { canReview, reason } = await canReviewProduct(userId, productId);

  if (!canReview) {
    // Show message instead of form
    return <div>{reason}</div>;
  }

  return <ReviewForm productId={productId} />;
}
```

### Update UI After Review Action
```typescript
// After creating/editing/deleting a review
router.refresh(); // Revalidate server components

// Or refetch data
await mutate(`/api/products/${productId}/reviews`);
```

### Handle Errors Gracefully
```typescript
try {
  const res = await fetch('/api/reviews/create', { ... });
  const data = await res.json();

  if (!res.ok) {
    if (res.status === 429) {
      setError('You are submitting reviews too quickly. Please try again later.');
    } else if (res.status === 403) {
      setError(data.error); // "You must purchase this product first"
    } else {
      setError('Failed to submit review. Please try again.');
    }
  }
} catch (err) {
  setError('Network error. Please check your connection.');
}
```

## Testing Tips

### Test Data Setup
```typescript
// 1. Create test user
// 2. Create test product
// 3. Create test order with entitlement
// 4. Now user can review

// In your test:
const review = await fetch('/api/reviews/create', {
  method: 'POST',
  body: JSON.stringify({
    productId: testProduct.id,
    rating: 5,
    comment: 'Test review with exactly 50 characters here!!'
  })
});
```

### Useful Test Cases
```typescript
// Test: Can't review without purchase
// Test: Can't review own product
// Test: Can't create duplicate review
// Test: Can edit own review
// Test: Can't edit someone else's review
// Test: Admin can delete any review
// Test: Rating aggregates update correctly
// Test: Rate limiting works
```

## Troubleshooting

### Review not appearing
- Check review status (only APPROVED shown by default)
- Verify product ID is correct
- Check if review was actually created (check response)

### Can't create review
- Verify user is authenticated
- Confirm user has active entitlement
- Check user is not the creator
- Ensure no existing review exists

### Rating aggregates wrong
- Call `updateProductRatingAggregates(productId)` manually
- Check that only APPROVED reviews are counted
- Verify ratingDistribution JSON is valid

### Rate limit errors
- Wait for time window to expire
- Adjust limits in `/src/lib/rate-limit/types.ts` if needed
- Check if RATE_LIMIT_DISABLED=true in development

---

**Quick Links:**
- [Full Implementation Guide](./REVIEWS_SYSTEM_IMPLEMENTATION.md)
- [Database Schema](./prisma/schema.prisma)
- [Helper Utilities](./src/lib/reviews/utils.ts)
