# Reviews & Ratings UI Components

A comprehensive set of UI components for building product review and rating features in SHUB-V1 (xLights Sequence Marketplace).

## Components Overview

### 1. StarRating
A flexible star rating component that supports both display and input modes.

**Features:**
- Display mode (read-only) for showing ratings
- Input mode (interactive) for collecting ratings
- Three size variants: sm, md, lg
- Partial star display for decimal ratings (e.g., 4.5 stars)
- Optional rating count display
- Smooth hover animations
- Fully accessible with keyboard navigation

**Props:**
```typescript
interface StarRatingProps {
  rating: number;           // 0-5 rating value
  onChange?: (rating: number) => void;  // Makes it interactive
  size?: 'sm' | 'md' | 'lg';  // Star size (default: md)
  readonly?: boolean;       // Display vs input mode (default: false)
  showCount?: boolean;      // Show "(4.5)" next to stars (default: false)
  className?: string;       // Additional CSS classes
}
```

**Usage:**
```tsx
// Display mode (read-only)
<StarRating rating={4.5} size="md" readonly showCount />

// Input mode (interactive)
<StarRating
  rating={userRating}
  onChange={setUserRating}
  size="lg"
/>
```

### 2. ReviewForm
A form component for submitting and editing product reviews.

**Features:**
- Create new reviews or edit existing ones
- Star rating input (required, 1-5)
- Review title (optional, max 100 chars)
- Review comment (optional, max 1000 chars)
- React Hook Form + Zod validation
- Character counters
- Loading states
- Error handling with toast notifications
- Success callbacks

**Props:**
```typescript
interface ReviewFormProps {
  productId: string;        // Product being reviewed
  existingReview?: Review;  // For edit mode
  onSuccess?: () => void;   // Callback after submission
  onCancel?: () => void;    // Callback for cancel button
}
```

**API Endpoints:**
- POST `/api/products/[id]/reviews` - Create new review
- PATCH `/api/reviews/[id]` - Update existing review

**Usage:**
```tsx
// Create new review
<ReviewForm
  productId="product-123"
  onSuccess={() => console.log('Review submitted!')}
/>

// Edit existing review
<ReviewForm
  productId="product-123"
  existingReview={review}
  onSuccess={() => console.log('Review updated!')}
  onCancel={() => setIsEditing(false)}
/>
```

### 3. ReviewList
A component to display all reviews for a product with pagination and sorting.

**Features:**
- Fetch and display reviews from API
- Pagination (10 reviews per page)
- Sort options: Most recent, Highest rated, Lowest rated
- Individual review cards with:
  - User avatar and name
  - Star rating
  - Verified Purchase badge
  - Review title and comment
  - Relative time (e.g., "2 days ago")
  - Edit/Delete buttons (for user's own review)
  - Helpful voting button with count
- Loading skeleton states
- Empty state message
- Inline editing mode
- Hover effects

**Props:**
```typescript
interface ReviewListProps {
  productId: string;        // Product to show reviews for
  currentUserId?: string;   // To highlight user's own review
}
```

**API Endpoints:**
- GET `/api/products/[id]/reviews?page=1&limit=10&sort=recent`
- DELETE `/api/reviews/[id]`
- POST `/api/reviews/[id]/helpful`

**Usage:**
```tsx
<ReviewList
  productId="product-123"
  currentUserId={user?.id}
/>
```

### 4. ReviewsSummary
A summary widget showing overall ratings and distribution.

**Features:**
- Large average rating display
- Star rating visualization
- Total review count
- Rating distribution bars (5 stars, 4 stars, etc.)
- Percentage and count for each rating level
- "Write a Review" button (conditional)
- Empty state for no reviews
- Responsive layout

**Props:**
```typescript
interface ReviewsSummaryProps {
  productId: string;
  averageRating: number;    // Average rating (0-5)
  reviewCount: number;      // Total number of reviews
  ratingDistribution?: {    // Optional breakdown
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  canReview?: boolean;      // Show write review button
  onWriteReview?: () => void;  // Callback for write review
  className?: string;
}
```

**Usage:**
```tsx
<ReviewsSummary
  productId="product-123"
  averageRating={4.5}
  reviewCount={42}
  ratingDistribution={{ 5: 25, 4: 12, 3: 3, 2: 1, 1: 1 }}
  canReview={userHasPurchased && !userHasReviewed}
  onWriteReview={() => setShowReviewForm(true)}
/>
```

## Complete Integration Example

Here's how to integrate all components on a product page:

```tsx
'use client';

import { useState } from 'react';
import {
  StarRating,
  ReviewForm,
  ReviewList,
  ReviewsSummary
} from '@/components/reviews';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export function ProductReviewsSection({
  productId,
  currentUserId,
  userHasPurchased,
  userHasReviewed,
  averageRating,
  reviewCount,
  ratingDistribution
}) {
  const [showReviewForm, setShowReviewForm] = useState(false);

  return (
    <div className="space-y-8">
      {/* Summary Section */}
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

      {/* Review Form (conditional) */}
      {showReviewForm && (
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
                  // Refresh reviews
                }}
                onCancel={() => setShowReviewForm(false)}
              />
            </CardContent>
          </Card>
        </section>
      )}

      {/* Reviews List */}
      <section>
        <ReviewList
          productId={productId}
          currentUserId={currentUserId}
        />
      </section>
    </div>
  );
}
```

## Database Schema Reference

The components work with the following Prisma models:

```prisma
model Review {
  id              String       @id @default(cuid())
  productId       String
  userId          String
  orderId         String
  entitlementId   String

  rating          Int          // 1-5 stars
  title           String?      // Optional (max 100 chars)
  comment         String       // Review text (50-2000 chars)

  status          ReviewStatus @default(APPROVED)
  verifiedPurchase Boolean     @default(true)
  helpfulCount    Int          @default(0)
  unhelpfulCount  Int          @default(0)

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  product         Product      @relation(...)
  user            User         @relation(...)
  order           Order        @relation(...)
}

model ReviewVote {
  id        String   @id @default(cuid())
  reviewId  String
  userId    String
  isHelpful Boolean
  createdAt DateTime @default(now())

  @@unique([reviewId, userId])
}
```

## API Endpoints Required

For full functionality, implement these API endpoints:

### Reviews
- `GET /api/products/[id]/reviews` - List reviews with pagination/sorting
- `POST /api/products/[id]/reviews` - Create new review
- `PATCH /api/reviews/[id]` - Update review
- `DELETE /api/reviews/[id]` - Delete review
- `POST /api/reviews/[id]/helpful` - Vote helpful

### Response Format
```typescript
// GET /api/products/[id]/reviews
{
  reviews: [
    {
      id: string;
      rating: number;
      title?: string;
      comment?: string;
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
  ],
  total: number;
  page: number;
  limit: number;
}
```

## Styling & Design

All components use:
- **shadcn/ui** components (Button, Card, Textarea, etc.)
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **date-fns** for date formatting
- Responsive design (mobile-friendly)
- Dark mode support (via Tailwind)

## Accessibility

All components follow accessibility best practices:
- Semantic HTML
- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader friendly

## Dependencies

Make sure these are installed:
```bash
npm install react-hook-form @hookform/resolvers zod
npm install date-fns
npm install lucide-react
```

## File Structure

```
src/components/reviews/
├── StarRating.tsx         # Star rating component
├── ReviewForm.tsx         # Review form component
├── ReviewList.tsx         # Reviews list with pagination
├── ReviewsSummary.tsx     # Summary widget
├── ReviewsExample.tsx     # Usage examples
├── index.ts               # Barrel exports
└── README.md              # This file
```

## Design Decisions

1. **StarRating Component**: Uses a dual-mode approach (display/input) to reduce component count
2. **ReviewForm**: Integrates with React Hook Form for robust form handling
3. **ReviewList**: Implements pagination to handle large review counts efficiently
4. **ReviewsSummary**: Shows rating distribution to help users make informed decisions
5. **Accessibility**: All components support keyboard navigation and screen readers
6. **Performance**: Uses loading skeletons and optimistic updates for better UX

## Next Steps

To complete the integration:
1. Implement the API endpoints listed above
2. Add the components to your product page
3. Test with real data
4. Add email notifications for new reviews (optional)
5. Implement moderation features (optional)

## Support

For questions or issues, refer to:
- Main project documentation: `/CLAUDE.md`
- Component examples: `ReviewsExample.tsx`
- shadcn/ui docs: https://ui.shadcn.com
