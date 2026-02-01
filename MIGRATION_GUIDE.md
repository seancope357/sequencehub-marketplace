# Stripe Connect Onboarding Migration Guide

## Quick Start

Follow these steps to integrate the Stripe Connect onboarding system into your existing SequenceHUB marketplace.

## Step 1: Database Schema Migration

The schema has been updated with new AuditAction enum values. Apply the changes:

```bash
# Generate Prisma client with new enums
bun run db:generate

# Push schema changes to database
bun run db:push
```

**What changed**:
- Added `STRIPE_ONBOARDING_STARTED` to AuditAction enum
- Added `STRIPE_ACCOUNT_UPDATED` to AuditAction enum
- Added `STRIPE_CAPABILITY_UPDATED` to AuditAction enum
- Added `STRIPE_DASHBOARD_ACCESSED` to AuditAction enum

## Step 2: Environment Variables

Add these variables to your `.env` file:

```bash
# Stripe Keys (get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx

# Stripe Webhook Secret (get after creating webhook endpoint)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Base URL for redirects
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Getting Stripe Keys

1. **Sign up for Stripe**: https://dashboard.stripe.com/register
2. **Get API keys**: Dashboard → Developers → API keys
3. **Create webhook endpoint**:
   - Go to: Dashboard → Developers → Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://yourdomain.com/api/webhooks/stripe` (or use Stripe CLI for local)
   - Select events:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `charge.refunded`
     - `account.updated` ← NEW
     - `account.application.deauthorized` ← NEW
     - `capability.updated` ← NEW
   - Copy the "Signing secret" to `STRIPE_WEBHOOK_SECRET`

### Local Development with Stripe CLI

For local testing without exposing your server:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# or download from https://stripe.com/docs/stripe-cli

# Login to your Stripe account
stripe login

# Forward webhooks to local server
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe

# The CLI will output a webhook signing secret - add it to .env
# whsec_xxxxxxxxxxxxx
```

## Step 3: Verify File Structure

Ensure all new files are in place:

```
/src/lib/
  ✅ stripe-connect.ts                     # NEW - Stripe utilities

/src/app/api/creator/onboarding/
  ✅ start/route.ts                        # NEW - Start onboarding
  ✅ status/route.ts                       # NEW - Check status
  ✅ dashboard/route.ts                    # NEW - Dashboard link

/src/app/dashboard/creator/onboarding/
  ✅ page.tsx                              # NEW - Onboarding UI

/src/app/api/webhooks/stripe/
  ✅ route.ts                              # UPDATED - Added account events

/prisma/
  ✅ schema.prisma                         # UPDATED - New AuditAction values

Documentation:
  ✅ STRIPE_CONNECT_ONBOARDING.md         # Complete documentation
  ✅ MIGRATION_GUIDE.md                   # This file
```

## Step 4: Update Navigation (Optional)

Add a link to the onboarding page in your creator dashboard navigation:

```tsx
// Example: /src/components/dashboard/sidebar.tsx
<nav>
  <Link href="/dashboard">Dashboard</Link>
  <Link href="/dashboard/products">Products</Link>
  <Link href="/dashboard/creator/onboarding">
    Stripe Setup  {/* NEW */}
  </Link>
</nav>
```

## Step 5: Update Checkout Validation (Recommended)

Enhance the checkout flow to verify onboarding completion:

```typescript
// /src/app/api/checkout/create/route.ts

// Existing check:
if (!creatorAccount || !creatorAccount.stripeAccountId) {
  return new Response('Creator not set up for payments', { status: 400 });
}

// ADD THIS CHECK:
if (creatorAccount.onboardingStatus !== 'COMPLETED') {
  return new Response('Creator onboarding incomplete', { status: 400 });
}

// Or use the utility function:
import { isAccountReadyForPayments } from '@/lib/stripe-connect';

const isReady = await isAccountReadyForPayments(creatorAccount.stripeAccountId);
if (!isReady) {
  return new Response('Creator not ready to receive payments', { status: 400 });
}
```

## Step 6: Test the Integration

### 6.1 Create Test Creator Account

```bash
# Start the dev server
bun run dev

# Login or register as a creator user
# Ensure user has CREATOR role in UserRole table
```

### 6.2 Start Onboarding

1. Navigate to: `http://localhost:3000/dashboard/creator/onboarding`
2. Click "Connect with Stripe"
3. Fill out Stripe onboarding form (use test data)
4. Complete the flow
5. Verify redirect back to platform
6. Check status shows "COMPLETED"

### 6.3 Test API Endpoints

```bash
# Get your auth token from browser cookies
export TOKEN="your_jwt_token_here"

# Check onboarding status
curl -X GET http://localhost:3000/api/creator/onboarding/status \
  -H "Cookie: auth_token=$TOKEN"

# Start onboarding (returns onboarding URL)
curl -X POST http://localhost:3000/api/creator/onboarding/start \
  -H "Cookie: auth_token=$TOKEN"

# Get dashboard link (after onboarding complete)
curl -X GET http://localhost:3000/api/creator/onboarding/dashboard \
  -H "Cookie: auth_token=$TOKEN"
```

### 6.4 Test Webhooks

```bash
# In one terminal, run the dev server
bun run dev

# In another terminal, forward webhooks
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger account.updated
stripe trigger capability.updated

# Check your server logs for webhook processing
```

### 6.5 Test End-to-End Payment Flow

1. Complete creator onboarding
2. Create a test product
3. Purchase the product as a buyer
4. Verify:
   - Payment succeeds
   - Platform fee deducted (10%)
   - Creator receives payment
   - Order created
   - Entitlement granted

## Step 7: Production Deployment

### Before Going Live

1. **Switch to Live Keys**:
   ```bash
   STRIPE_SECRET_KEY=sk_live_xxxxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
   ```

2. **Update Webhook Endpoint**:
   - Stripe Dashboard → Webhooks
   - Add production endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Copy new webhook secret to production `.env`

3. **Verify Environment**:
   ```bash
   NEXT_PUBLIC_BASE_URL=https://yourdomain.com
   ```

4. **Test on Staging First**:
   - Complete full onboarding flow
   - Test with small real transaction
   - Verify webhooks work
   - Check audit logs

5. **Monitor Initial Deployments**:
   - Watch webhook event history in Stripe Dashboard
   - Monitor application logs for errors
   - Check audit log entries
   - Verify creator accounts update correctly

## Rollback Plan

If issues occur during deployment:

### Database Rollback

```bash
# Revert schema changes
git checkout HEAD~1 prisma/schema.prisma

# Regenerate client
bun run db:generate

# Note: Existing data is safe - only new enum values removed
```

### Code Rollback

```bash
# Remove new files
rm -rf src/lib/stripe-connect.ts
rm -rf src/app/api/creator/onboarding
rm -rf src/app/dashboard/creator/onboarding

# Revert webhook handler
git checkout HEAD~1 src/app/api/webhooks/stripe/route.ts
```

### Webhook Rollback

- Stripe Dashboard → Webhooks
- Remove new event types (account.updated, etc.)
- Keep existing webhook endpoint

## Troubleshooting

### Issue: Database migration fails

**Solution**: The schema only adds enum values, which is non-destructive. If using PostgreSQL and migration fails:

```sql
-- Manually add enum values
ALTER TYPE "AuditAction" ADD VALUE 'STRIPE_ONBOARDING_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'STRIPE_ACCOUNT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'STRIPE_CAPABILITY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'STRIPE_DASHBOARD_ACCESSED';
```

### Issue: Webhooks not working

**Check**:
1. Webhook endpoint is publicly accessible (not localhost)
2. Webhook secret matches environment variable
3. All required events are selected in Stripe Dashboard
4. Server logs show webhook received but processing failed

**For local development**: Always use Stripe CLI

### Issue: Onboarding link expires

**This is expected**: Account links expire after 5 minutes for security. Just generate a new one.

### Issue: TypeScript errors

**Solution**: Regenerate Prisma client

```bash
bun run db:generate
```

### Issue: Module not found errors

**Solution**: Restart dev server

```bash
# Stop server (Ctrl+C)
rm -rf .next
bun run dev
```

## Validation Checklist

Before marking migration complete:

- [ ] Database schema updated successfully
- [ ] All new files present
- [ ] Environment variables configured
- [ ] Stripe webhook endpoint created
- [ ] Test onboarding flow works
- [ ] Test webhooks received and processed
- [ ] Audit logs created for all actions
- [ ] Creator can access Stripe Dashboard
- [ ] End-to-end payment flow works
- [ ] Platform fee calculated correctly
- [ ] Documentation reviewed
- [ ] Production deployment plan ready

## Getting Help

If you encounter issues:

1. **Check logs**: Server console and Stripe Dashboard → Events
2. **Review documentation**: `STRIPE_CONNECT_ONBOARDING.md`
3. **Stripe support**: https://support.stripe.com/
4. **Audit logs**: Check database AuditLog table for errors

## Summary

This migration adds:
- ✅ Stripe Connect Express onboarding for creators
- ✅ Three new API endpoints
- ✅ Creator onboarding dashboard UI
- ✅ Enhanced webhook handling
- ✅ Comprehensive audit logging
- ✅ Production-ready security

**Estimated time**: 30-60 minutes for complete integration and testing

**Risk level**: Low - Non-breaking changes, new features only

**Rollback time**: < 5 minutes if needed
