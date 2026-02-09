# Stripe Checkout - Quick Reference Guide

## For Developers

### Using the BuyNowButton Component

```tsx
import { BuyNowButton } from '@/components/checkout/BuyNowButton';

// Basic usage
<BuyNowButton
  productId={product.id}
  productSlug={product.slug}
  price={product.price}
  alreadyPurchased={product.purchased}
/>

// With custom styling
<BuyNowButton
  productId={product.id}
  productSlug={product.slug}
  price={product.price}
  alreadyPurchased={product.purchased}
  className="w-full"
  size="lg"
  variant="default"
/>

// With custom redirect URLs
<BuyNowButton
  productId={product.id}
  productSlug={product.slug}
  price={product.price}
  successUrl="/custom/success"
  cancelUrl="/custom/cancel"
/>
```

### Creating a Checkout Session (API)

```typescript
// POST /api/checkout/create
const response = await fetch('/api/checkout/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productId: 'cuid_abc123',
    successUrl: '/library?purchase=success',  // optional
    cancelUrl: '/p/my-product'                // optional
  }),
});

const data = await response.json();
// { checkoutUrl: "https://checkout.stripe.com/...", sessionId: "cs_test_..." }

// Redirect to Stripe
window.location.assign(data.checkoutUrl);
```

### Checking Product Ownership

```typescript
// Already included in GET /api/products/[slug]
const response = await fetch(`/api/products/${slug}`);
const { product } = await response.json();

if (product.purchased) {
  // User owns this product
  console.log('User already purchased this product');
} else {
  // User does not own this product
  console.log('Show buy button');
}
```

### Handling Checkout Return

The return handler is automatic. Users are redirected to:
- Success: `/library?purchase=success`
- Cancelled: `/p/{slug}?purchase=cancelled`
- Expired: `/p/{slug}?purchase=expired`
- Processing: `/library?purchase=processing`

You can check the query parameter on your page:

```tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function LibraryPage() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const purchase = searchParams.get('purchase');
    
    if (purchase === 'success') {
      toast.success('Purchase completed! Your product is now available.');
    } else if (purchase === 'processing') {
      toast.info('Your purchase is being processed...');
    }
  }, [searchParams]);
  
  // ... rest of page
}
```

---

## For Testers

### Test Card Numbers

| Card Number | Description |
|------------|-------------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Decline |
| 4000 0025 0000 3155 | Requires 3D Secure |

**Expiry**: Any future date (e.g., 12/25)  
**CVC**: Any 3 digits (e.g., 123)  
**ZIP**: Any 5 digits (e.g., 12345)

### Quick Test Flow

1. Login: `admin@sequencehub.com` / `admin123`
2. Browse: `/browse`
3. Select any product
4. Click "Buy Now"
5. Use test card: `4242 4242 4242 4242`
6. Complete payment
7. Verify redirect to `/library?purchase=success`
8. Return to product page
9. Button should say "Go to Library"

### Testing Different Scenarios

**Scenario 1: Not Logged In**
- Logout
- Visit product page
- Button says "Login to Purchase"
- Click button
- Redirects to login

**Scenario 2: Already Purchased**
- Purchase a product
- Return to product page
- Button says "Go to Library"
- Click button
- Redirects to library

**Scenario 3: Payment Declined**
- Start checkout
- Use card: `4000 0000 0000 0002`
- Payment should fail
- Error message displayed
- User stays on Stripe page

**Scenario 4: Cancel Payment**
- Start checkout
- Click "Back" or cancel
- Redirects to product page
- Query param: `?purchase=cancelled`

---

## For Product Managers

### User Journey

```
[Browse Products] → [Select Product] → [Click "Buy Now"]
         ↓
[Stripe Checkout Page]
         ↓
[Enter Payment Details]
         ↓
[Complete Payment] → [Redirect to Library]
         ↓
[Download Product]
```

### Conversion Funnel

1. **Product View**: User visits `/p/{slug}`
2. **Checkout Initiate**: User clicks "Buy Now"
3. **Stripe Load**: Stripe Checkout page loads
4. **Payment Submit**: User enters card details
5. **Payment Success**: Payment processed
6. **Order Complete**: Order created, entitlement granted
7. **Return**: User redirected to library

### Key Metrics to Track

- Checkout initiations (POST /api/checkout/create)
- Checkout completions (webhook: checkout.session.completed)
- Abandonment rate (initiated but not completed)
- Time to complete checkout
- Error rate by type

### Platform Fee Breakdown

For a $10.00 product:
- **Customer Pays**: $10.00
- **Stripe Fees**: ~$0.59 (2.9% + $0.30)
- **Platform Fee**: $1.00 (10%)
- **Creator Receives**: $8.41

For a $50.00 product:
- **Customer Pays**: $50.00
- **Stripe Fees**: ~$1.75 (2.9% + $0.30)
- **Platform Fee**: $5.00 (10%)
- **Creator Receives**: $43.25

---

## For Creators

### When Can I Start Selling?

You can start selling once:
1. ✅ You complete Stripe Connect onboarding
2. ✅ Your Stripe account is verified
3. ✅ You publish a product

### How Do I Get Paid?

1. Customer purchases your product
2. Stripe collects payment
3. Platform fee (10%) is deducted
4. Remaining amount is transferred to your Stripe account
5. You can view payouts in Stripe Dashboard

### Payout Schedule

Default: **Manual** (you request payouts)

You can change to:
- Daily (next business day)
- Weekly (every Monday)
- Monthly (1st of each month)

Change in: `/dashboard/creator/settings` (future feature)

### Platform Fee

**Default**: 10% of sale price

This covers:
- Payment processing
- Hosting and bandwidth
- Platform maintenance
- Customer support
- Security and compliance

---

## Troubleshooting

### Error: "Creator account not configured"

**Cause**: Creator hasn't completed Stripe Connect onboarding

**Solution**: 
1. Go to `/dashboard/creator/onboarding`
2. Complete Stripe Connect setup
3. Wait for account verification

### Error: "Product price not found"

**Cause**: Product doesn't have an active price

**Solution**:
1. Go to product settings
2. Add or activate a price
3. Save changes

### Error: "Product is not available for purchase"

**Cause**: Product status is not PUBLISHED

**Solution**:
1. Go to product settings
2. Change status to PUBLISHED
3. Save changes

### User Says: "I paid but don't have access"

**Possible Causes**:
1. Webhook not processed yet (wait 1-2 minutes)
2. Webhook failed (check logs)
3. User logged into different account

**Solution**:
1. Check `CheckoutSession` table for session status
2. Check `Entitlement` table for user's entitlements
3. Check `AuditLog` for webhook events
4. If webhook failed, manually trigger or create entitlement

### Stripe CLI Testing

```bash
# Listen to webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed

# View events
stripe events list --limit 10
```

---

## API Endpoints Reference

### Checkout

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | /api/checkout/create | ✅ Yes | Create checkout session |
| GET | /api/checkout/return | ✅ Yes | Handle checkout return |

### Products

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | /api/products | ❌ No | List products |
| GET | /api/products/[slug] | ❌ No* | Get product details |

*Auth optional, used for ownership check

### Library

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | /api/library | ✅ Yes | Get user's purchases |
| POST | /api/library/download | ✅ Yes | Generate download URL |

### Webhooks

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | /api/webhooks/stripe | ❌ No* | Stripe webhook handler |

*Uses Stripe signature verification

---

## Environment Variables

### Required for Checkout

```bash
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### Required for Webhooks

```bash
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Required for Frontend

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

---

## Support & Resources

### Internal Documentation
- Full Implementation: `CHECKOUT_INTEGRATION_SUMMARY.md`
- Project Overview: `CLAUDE.md`
- API Documentation: `ARCHITECTURE.md`

### Stripe Documentation
- Checkout: https://stripe.com/docs/payments/checkout
- Connect: https://stripe.com/docs/connect
- Testing: https://stripe.com/docs/testing

### Get Help
- Check `AuditLog` table for debugging
- Review Stripe Dashboard for payment logs
- Use Stripe CLI for local testing

---

**Last Updated**: February 9, 2026
