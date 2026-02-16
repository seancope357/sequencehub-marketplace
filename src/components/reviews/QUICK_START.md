# Reviews & Ratings Components - Quick Start Guide

## Installation (Already Complete)

All dependencies are already installed in the project:
- `react-hook-form` + `@hookform/resolvers` + `zod`
- `date-fns`
- `lucide-react`
- `shadcn/ui` components

## 1. Quick Integration (5 minutes)

### Add to Product Page

```tsx
// app/products/[slug]/page.tsx
import { ReviewsSummary, ReviewList } from '@/components/reviews';

export default function ProductPage({ params }) {
  const { slug } = params;
  // ... fetch product data

  return (
    <div>
      {/* Your existing product content */}

      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>

        <ReviewsSummary
          productId={product.id}
          averageRating={product.averageRating}
          reviewCount={product.reviewCount}
        />

        <div className="mt-8">
          <ReviewList
            productId={product.id}
            currentUserId={user?.id}
          />
        </div>
      </section>
    </div>
  );
}
```

## 2. API Endpoints (Must Implement)

Create these API routes:

### GET /api/products/[id]/reviews
```typescript
// app/api/products/[id]/reviews/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const sort = searchParams.get('sort') || 'recent';

  const reviews = await prisma.review.findMany({
    where: { productId: params.id, status: 'APPROVED' },
    include: {
      user: { select: { id: true, name: true, email: true } }
    },
    orderBy: sort === 'recent' ? { createdAt: 'desc' }
      : sort === 'highest' ? { rating: 'desc' }
      : { rating: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await prisma.review.count({
    where: { productId: params.id, status: 'APPROVED' }
  });

  return Response.json({ reviews, total, page, limit });
}
```

### POST /api/products/[id]/reviews
```typescript
// app/api/products/[id]/reviews/route.ts
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser(request);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = await request.json();
  const { rating, title, comment } = body;

  // Verify user has purchased the product
  const entitlement = await prisma.entitlement.findFirst({
    where: {
      userId: user.id,
      productId: params.id,
      isActive: true
    },
    include: { order: true }
  });

  if (!entitlement) {
    return new Response('Must purchase product to review', { status: 403 });
  }

  // Check if user already reviewed
  const existingReview = await prisma.review.findFirst({
    where: { userId: user.id, productId: params.id }
  });

  if (existingReview) {
    return new Response('Already reviewed', { status: 400 });
  }

  const review = await prisma.review.create({
    data: {
      productId: params.id,
      userId: user.id,
      orderId: entitlement.orderId,
      entitlementId: entitlement.id,
      rating,
      title,
      comment,
      verifiedPurchase: true,
    }
  });

  return Response.json({ success: true, review });
}
```

### PATCH /api/reviews/[id]
```typescript
// app/api/reviews/[id]/route.ts
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser(request);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const review = await prisma.review.findUnique({
    where: { id: params.id }
  });

  if (!review || review.userId !== user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  const body = await request.json();
  const updated = await prisma.review.update({
    where: { id: params.id },
    data: { ...body, updatedAt: new Date() }
  });

  return Response.json({ success: true, review: updated });
}
```

### DELETE /api/reviews/[id]
```typescript
// app/api/reviews/[id]/route.ts
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser(request);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const review = await prisma.review.findUnique({
    where: { id: params.id }
  });

  if (!review || review.userId !== user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  await prisma.review.delete({
    where: { id: params.id }
  });

  return Response.json({ success: true });
}
```

### POST /api/reviews/[id]/helpful
```typescript
// app/api/reviews/[id]/helpful/route.ts
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser(request);
  if (!user) return new Response('Unauthorized', { status: 401 });

  // Check if already voted
  const existingVote = await prisma.reviewVote.findUnique({
    where: {
      reviewId_userId: {
        reviewId: params.id,
        userId: user.id
      }
    }
  });

  if (existingVote) {
    return new Response('Already voted', { status: 400 });
  }

  // Create vote and increment count
  await prisma.$transaction([
    prisma.reviewVote.create({
      data: {
        reviewId: params.id,
        userId: user.id,
        isHelpful: true
      }
    }),
    prisma.review.update({
      where: { id: params.id },
      data: { helpfulCount: { increment: 1 } }
    })
  ]);

  return Response.json({ success: true });
}
```

## 3. Update Product Model

Add these fields to calculate average rating:

```prisma
model Product {
  // ... existing fields
  averageRating   Float   @default(0)
  reviewCount     Int     @default(0)
  reviews         Review[]
}
```

Create a helper function to update ratings:

```typescript
// lib/reviews.ts
export async function updateProductRating(productId: string) {
  const reviews = await prisma.review.findMany({
    where: { productId, status: 'APPROVED' },
    select: { rating: true }
  });

  const total = reviews.length;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const average = total > 0 ? sum / total : 0;

  await prisma.product.update({
    where: { id: productId },
    data: {
      averageRating: average,
      reviewCount: total
    }
  });
}

// Call this after creating/updating/deleting reviews
```

## 4. Component Usage Examples

### Just Star Rating
```tsx
import { StarRating } from '@/components/reviews';

<StarRating rating={4.5} size="md" readonly showCount />
```

### Full Review Section
```tsx
import {
  ReviewsSummary,
  ReviewForm,
  ReviewList
} from '@/components/reviews';

<div className="space-y-8">
  <ReviewsSummary
    productId={productId}
    averageRating={4.5}
    reviewCount={42}
    canReview={canUserReview}
    onWriteReview={() => setShowForm(true)}
  />

  {showForm && (
    <ReviewForm
      productId={productId}
      onSuccess={() => setShowForm(false)}
    />
  )}

  <ReviewList
    productId={productId}
    currentUserId={userId}
  />
</div>
```

### Product Card Rating Display
```tsx
import { StarRating } from '@/components/reviews';

<div className="flex items-center gap-2">
  <StarRating rating={product.averageRating} size="sm" readonly />
  <span className="text-sm text-muted-foreground">
    ({product.reviewCount} reviews)
  </span>
</div>
```

## 5. Testing

Test with these scenarios:

1. **No reviews yet**: Empty state message displays
2. **View reviews**: List loads and paginates
3. **Sort reviews**: Dropdown changes order
4. **Write review**: Form validates and submits
5. **Edit review**: Inline editing works
6. **Delete review**: Confirmation and deletion work
7. **Vote helpful**: Count increments (once per user)
8. **Unauthorized**: Redirect to login
9. **Not purchased**: Cannot review message

## 6. Common Issues & Solutions

### Issue: StarRating not displaying
**Solution**: Check that `lucide-react` is installed and Star icon is imported

### Issue: Form not submitting
**Solution**: Verify API endpoint exists and returns proper response format

### Issue: Reviews not loading
**Solution**: Check API response format matches expected structure

### Issue: Pagination broken
**Solution**: Ensure total count is returned from API

### Issue: Helpful voting not working
**Solution**: Check ReviewVote model has unique constraint on [reviewId, userId]

## 7. Performance Tips

1. **Paginate**: Always paginate reviews (10 per page)
2. **Cache**: Cache average rating on Product model
3. **Index**: Add database indexes on frequently queried fields
4. **Lazy load**: Load reviews below the fold
5. **Debounce**: Debounce search/filter inputs

## 8. Security Checklist

- [ ] Verify user owns review before edit/delete
- [ ] Verify user purchased product before allowing review
- [ ] Prevent duplicate reviews from same user
- [ ] Prevent duplicate helpful votes
- [ ] Sanitize review content (prevent XSS)
- [ ] Rate limit review submissions
- [ ] Validate all input on server side

## 9. Next Steps

1. Implement the 5 API endpoints above
2. Add `averageRating` and `reviewCount` to Product model
3. Add components to product pages
4. Test with real data
5. Optional: Add email notifications
6. Optional: Add moderation dashboard

## 10. Support

- Full documentation: `README.md`
- Visual guide: `COMPONENTS_OVERVIEW.md`
- Examples: `ReviewsExample.tsx`
- Main project docs: `/CLAUDE.md`

## Quick Commands

```bash
# Verify components exist
ls src/components/reviews/

# Test build
npm run build

# Run dev server
npm run dev

# Check TypeScript
npx tsc --noEmit
```

That's it! You're ready to integrate reviews into your product pages.
