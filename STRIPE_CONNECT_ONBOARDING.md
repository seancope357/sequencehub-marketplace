# Stripe Connect Express Onboarding Guide

## Overview

This implementation provides a complete Stripe Connect Express onboarding flow for creator accounts in the SequenceHUB marketplace. Creators must complete Stripe onboarding before they can receive payments from product sales.

## Architecture

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Creator Onboarding Flow                   │
└─────────────────────────────────────────────────────────────┘

1. Creator visits /dashboard/creator/onboarding
   │
   ├──► Checks onboarding status (GET /api/creator/onboarding/status)
   │
2. Clicks "Connect with Stripe"
   │
   ├──► POST /api/creator/onboarding/start
   │    ├──► Creates Stripe Express account
   │    ├──► Stores stripeAccountId in CreatorAccount
   │    └──► Returns onboarding URL
   │
3. Redirects to Stripe-hosted onboarding
   │
   ├──► Creator fills in business info
   ├──► Verifies identity
   └──► Adds bank account
   │
4. Stripe redirects back to platform
   │
   ├──► Success: /dashboard/creator/onboarding?success=true
   ├──► Refresh: /dashboard/creator/onboarding?refresh=true
   │
5. Stripe sends webhook: account.updated
   │
   ├──► Updates CreatorAccount.onboardingStatus
   └──► Sets stripeAccountStatus to 'active'
   │
6. Creator can now receive payments!
```

## Implementation Details

### 1. Stripe Utilities (`/src/lib/stripe-connect.ts`)

Core functions for Stripe Connect account management:

- `createConnectedAccount(userId, email)` - Creates Stripe Express account
- `createAccountOnboardingLink(stripeAccountId)` - Generates onboarding URL
- `createExpressDashboardLink(stripeAccountId)` - Generates dashboard URL
- `getAccountStatus(stripeAccountId)` - Checks onboarding completion
- `updateCreatorAccountStatus(stripeAccountId, account)` - Syncs DB with Stripe
- `initializeCreatorAccount(userId, email)` - End-to-end initialization
- `isAccountReadyForPayments(stripeAccountId)` - Validates payment readiness
- `handleAccountDeauthorization(stripeAccountId)` - Handles disconnections

### 2. API Endpoints

#### POST /api/creator/onboarding/start

Initializes Stripe Connect account and returns onboarding URL.

**Authentication**: Required (JWT)
**Authorization**: CREATOR or ADMIN role

**Request**: No body required

**Response**:
```json
{
  "success": true,
  "stripeAccountId": "acct_xxxxx",
  "onboardingUrl": "https://connect.stripe.com/setup/..."
}
```

**Security**:
- Verifies user authentication
- Checks CREATOR role
- Creates audit log entry
- Handles existing accounts gracefully

**Implementation**: `/src/app/api/creator/onboarding/start/route.ts`

---

#### GET /api/creator/onboarding/status

Checks current onboarding status for the authenticated creator.

**Authentication**: Required (JWT)
**Authorization**: CREATOR or ADMIN role

**Request**: No parameters

**Response**:
```json
{
  "success": true,
  "hasAccount": true,
  "stripeAccountId": "acct_xxxxx",
  "onboardingStatus": "COMPLETED",
  "isComplete": true,
  "chargesEnabled": true,
  "detailsSubmitted": true,
  "capabilitiesActive": true,
  "needsOnboarding": false,
  "canReceivePayments": true
}
```

**Implementation**: `/src/app/api/creator/onboarding/status/route.ts`

---

#### GET /api/creator/onboarding/dashboard

Generates a login link to the Stripe Express Dashboard.

**Authentication**: Required (JWT)
**Authorization**: CREATOR or ADMIN role

**Request**: No parameters

**Response**:
```json
{
  "success": true,
  "dashboardUrl": "https://connect.stripe.com/express/..."
}
```

**Requirements**:
- Stripe account must exist
- Onboarding must be COMPLETED

**Implementation**: `/src/app/api/creator/onboarding/dashboard/route.ts`

---

### 3. Creator Dashboard UI

**Location**: `/src/app/dashboard/creator/onboarding/page.tsx`

**Features**:
- Real-time onboarding status display
- Visual checklist (account created, details submitted, capabilities active, etc.)
- "Connect with Stripe" button for initial setup
- "Continue Setup" button for incomplete onboarding
- "Open Stripe Dashboard" button for completed accounts
- Refresh button to update status
- Success/error message handling
- URL parameter handling (success=true, refresh=true)

**User Flow**:
1. Page loads and fetches status
2. Shows current onboarding state
3. User clicks action button
4. Redirects to Stripe or opens dashboard
5. Returns to page with status update

---

### 4. Webhook Handlers

Extended `/src/app/api/webhooks/stripe/route.ts` with three new event handlers:

#### account.updated

Triggered when a Stripe account is updated (e.g., onboarding completed).

**Actions**:
- Fetches CreatorAccount by stripeAccountId
- Determines onboarding completion status
- Updates `onboardingStatus` (PENDING → IN_PROGRESS → COMPLETED)
- Updates `stripeAccountStatus` (pending → active)
- Creates audit log entry

**Implementation**:
```typescript
async function handleAccountUpdated(account: Stripe.Account) {
  const isComplete = Boolean(
    account.details_submitted &&
    account.charges_enabled &&
    account.payouts_enabled
  );

  const onboardingStatus = isComplete ? 'COMPLETED' :
    account.details_submitted ? 'IN_PROGRESS' : 'PENDING';

  await db.creatorAccount.update({
    where: { stripeAccountId: account.id },
    data: { onboardingStatus, stripeAccountStatus: ... }
  });
}
```

---

#### account.application.deauthorized

Triggered when a creator disconnects their Stripe account.

**Actions**:
- Sets `stripeAccountStatus` to 'deauthorized'
- Sets `onboardingStatus` to 'SUSPENDED'
- Creates SECURITY_ALERT audit log
- Prevents further payment processing

---

#### capability.updated

Triggered when account capabilities change (e.g., card_payments, transfers).

**Actions**:
- Logs capability status changes
- Tracks requirements for activation
- Creates audit log for debugging

---

### 5. Database Schema Updates

Added new AuditAction enum values to `prisma/schema.prisma`:

```prisma
enum AuditAction {
  // ... existing actions
  STRIPE_ONBOARDING_STARTED
  STRIPE_ACCOUNT_UPDATED
  STRIPE_CAPABILITY_UPDATED
  STRIPE_DASHBOARD_ACCESSED
  // ... existing actions
}
```

**Migration Required**: Run `bun run db:push` to apply schema changes.

---

## Security Implementation

### Authentication & Authorization

All endpoints implement:

1. **JWT Verification**: Extract and verify auth token
2. **User Lookup**: Fetch user from database
3. **Role Check**: Verify CREATOR or ADMIN role
4. **Ownership Validation**: User can only access their own account

### Audit Logging

Every critical action is logged:

- `STRIPE_ONBOARDING_STARTED` - When onboarding begins
- `STRIPE_ACCOUNT_UPDATED` - When Stripe sends account updates
- `STRIPE_CAPABILITY_UPDATED` - When capabilities change
- `STRIPE_DASHBOARD_ACCESSED` - When creator opens dashboard
- `SECURITY_ALERT` - When account is deauthorized

Audit logs include:
- `userId` - Who performed the action
- `action` - What happened
- `entityType` - What was affected (creator_account)
- `entityId` - Stripe account ID
- `metadata` - JSON with additional context
- `ipAddress` - Client IP
- `userAgent` - Client browser

### Webhook Signature Verification

All webhooks verify Stripe signatures before processing:

```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### Error Handling

- Try-catch blocks on all async operations
- Detailed error logging
- Security alerts for failures
- User-friendly error messages (no sensitive data leakage)

---

## Environment Variables

### Required Variables

Add these to your `.env` file:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxxxx  # Test key (sk_test_) or Live key (sk_live_)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # From Stripe Dashboard → Webhooks

# Public Keys (for client-side)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Application URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Production: https://sequencehub.com

# Database
DATABASE_URL=file:./db/custom.db

# Security Secrets
JWT_SECRET=your-secret-key-change-in-production
DOWNLOAD_SECRET=your-download-secret-change-in-production
```

### Obtaining Stripe Keys

1. **Create Stripe Account**: https://dashboard.stripe.com/register
2. **Get API Keys**: Dashboard → Developers → API keys
3. **Create Webhook**:
   - Dashboard → Developers → Webhooks → Add endpoint
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `charge.refunded`
     - `account.updated`
     - `account.application.deauthorized`
     - `capability.updated`
   - Copy webhook signing secret

### Testing with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# or download from https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger account.updated
stripe trigger capability.updated
```

---

## Integration with Checkout Flow

The checkout flow in `/src/app/api/checkout/create/route.ts` already verifies creator onboarding:

```typescript
const creatorAccount = product.creator.creatorAccount;
if (!creatorAccount || !creatorAccount.stripeAccountId) {
  return new Response('Creator not set up for payments', { status: 400 });
}
```

**Recommendation**: Add additional check for `onboardingStatus === 'COMPLETED'`:

```typescript
if (creatorAccount.onboardingStatus !== 'COMPLETED') {
  return new Response('Creator onboarding not complete', { status: 400 });
}
```

---

## Testing Checklist

### Manual Testing Steps

1. **Initial Onboarding**:
   - [ ] Log in as creator
   - [ ] Navigate to `/dashboard/creator/onboarding`
   - [ ] Verify status shows "PENDING"
   - [ ] Click "Connect with Stripe"
   - [ ] Redirected to Stripe onboarding
   - [ ] Complete onboarding form
   - [ ] Verify redirect back to platform
   - [ ] Check status updated to "COMPLETED"

2. **Dashboard Access**:
   - [ ] After onboarding complete
   - [ ] Click "Open Stripe Dashboard"
   - [ ] Verify opens in new tab
   - [ ] Check can view payouts and transactions

3. **Incomplete Onboarding**:
   - [ ] Start onboarding but don't complete
   - [ ] Close Stripe window
   - [ ] Return to platform
   - [ ] Verify status shows "IN_PROGRESS"
   - [ ] Click "Continue Setup"
   - [ ] Verify can resume onboarding

4. **Webhook Testing**:
   - [ ] Use Stripe CLI to forward webhooks
   - [ ] Trigger `account.updated` event
   - [ ] Check database for status update
   - [ ] Check audit log for event
   - [ ] Trigger `account.application.deauthorized`
   - [ ] Verify account suspended

5. **Checkout Integration**:
   - [ ] Create product as onboarded creator
   - [ ] Try to purchase as buyer
   - [ ] Verify checkout works
   - [ ] Check platform fee deducted
   - [ ] Verify creator receives payment

### API Testing

```bash
# Check onboarding status
curl -X GET http://localhost:3000/api/creator/onboarding/status \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN"

# Start onboarding
curl -X POST http://localhost:3000/api/creator/onboarding/start \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN"

# Get dashboard link
curl -X GET http://localhost:3000/api/creator/onboarding/dashboard \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN"
```

---

## Common Issues & Solutions

### Issue: Onboarding link expires

**Symptoms**: User gets error clicking old onboarding link

**Solution**: Onboarding links expire after 5 minutes. Click "Connect with Stripe" again to generate new link.

**Code**:
```typescript
// Links are automatically short-lived by Stripe
const accountLink = await stripe.accountLinks.create({
  account: stripeAccountId,
  refresh_url: `${BASE_URL}/dashboard/creator/onboarding?refresh=true`,
  return_url: `${BASE_URL}/dashboard/creator/onboarding?success=true`,
  type: 'account_onboarding',
});
```

---

### Issue: Webhook not received

**Symptoms**: Onboarding complete but status not updated

**Diagnosis**:
- Check Stripe Dashboard → Webhooks → Event history
- Verify endpoint URL is correct
- Check webhook secret matches .env
- Ensure server is publicly accessible

**Solution**:
```bash
# Use Stripe CLI for local development
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe

# Check webhook logs
grep "webhook" dev.log
```

---

### Issue: Account already exists

**Symptoms**: Error creating Stripe account

**Solution**: The `initializeCreatorAccount` function handles this:

```typescript
const existingAccount = await db.creatorAccount.findUnique({
  where: { userId },
});

if (existingAccount?.stripeAccountId) {
  // Just generate new onboarding link
  stripeAccountId = existingAccount.stripeAccountId;
} else {
  // Create new account
  const account = await createConnectedAccount(userId, email);
}
```

---

### Issue: Creator can't receive payments

**Symptoms**: Checkout fails with "Creator not set up"

**Diagnosis**: Check all requirements:
1. `stripeAccountId` exists
2. `onboardingStatus === 'COMPLETED'`
3. `chargesEnabled === true`
4. `capabilities.card_payments === 'active'`

**Solution**:
```typescript
const isReady = await isAccountReadyForPayments(stripeAccountId);
if (!isReady) {
  // Redirect to onboarding
  router.push('/dashboard/creator/onboarding');
}
```

---

## File Structure

```
/src
  /lib
    stripe-connect.ts              # Stripe Connect utilities
    auth.ts                        # Updated with audit log helpers

  /app
    /api
      /creator
        /onboarding
          /start
            route.ts               # POST - Start onboarding
          /status
            route.ts               # GET - Check status
          /dashboard
            route.ts               # GET - Dashboard link

      /webhooks
        /stripe
          route.ts                 # Updated with account events

    /dashboard
      /creator
        /onboarding
          page.tsx                 # Onboarding UI

/prisma
  schema.prisma                    # Updated AuditAction enum

/STRIPE_CONNECT_ONBOARDING.md     # This documentation
```

---

## Production Deployment Checklist

Before going live:

- [ ] Switch to live Stripe keys (`sk_live_`, `pk_live_`)
- [ ] Update webhook endpoint to production URL
- [ ] Add all webhook events in Stripe Dashboard
- [ ] Set `NEXT_PUBLIC_BASE_URL` to production domain
- [ ] Test onboarding flow on staging
- [ ] Verify webhook signature verification
- [ ] Enable audit log monitoring
- [ ] Set up Stripe alerts for failed webhooks
- [ ] Document platform fee percentage (10% default)
- [ ] Test with real bank account (small amount)
- [ ] Verify tax settings in Stripe
- [ ] Configure payout schedule (manual vs automatic)

---

## Platform Fee Configuration

Default platform fee is **10%**, configured in:

```typescript
// /src/lib/stripe-connect.ts
await db.creatorAccount.create({
  data: {
    userId,
    stripeAccountId,
    platformFeePercent: 10.0,  // 10% platform fee
    // ...
  },
});
```

To change per-creator fee:

```typescript
await db.creatorAccount.update({
  where: { userId: creatorId },
  data: { platformFeePercent: 5.0 },  // 5% for premium creators
});
```

Fee is applied in checkout:

```typescript
// /src/app/api/checkout/create/route.ts
const platformFeeAmount = Math.round(
  price.amount * 100 * (creatorAccount.platformFeePercent / 100)
);
```

---

## Support & Troubleshooting

### Stripe Documentation
- Connect Overview: https://stripe.com/docs/connect
- Express Accounts: https://stripe.com/docs/connect/express-accounts
- Account Links: https://stripe.com/docs/connect/account-links
- Webhooks: https://stripe.com/docs/webhooks

### Debug Checklist
1. Check database for CreatorAccount record
2. Verify stripeAccountId matches Stripe Dashboard
3. Check audit logs for recent events
4. Test webhook signature locally
5. Review Stripe event history
6. Verify environment variables loaded
7. Check browser console for errors
8. Review server logs for exceptions

---

## Summary

This implementation provides:

✅ Complete Stripe Connect Express onboarding
✅ Three API endpoints for account management
✅ Creator dashboard UI with real-time status
✅ Webhook handlers for account events
✅ Comprehensive security with audit logging
✅ Error handling and user feedback
✅ Production-ready code with proper validation
✅ Detailed documentation and testing guide

Creators can now:
- Connect Stripe accounts in minutes
- Receive payments directly to their bank
- Manage payouts via Stripe Dashboard
- Track earnings and transactions
- Update account settings independently

Platform benefits:
- Automated payment splitting
- Compliance with financial regulations
- Audit trail for all onboarding events
- Scalable multi-seller architecture
- Minimal maintenance overhead
