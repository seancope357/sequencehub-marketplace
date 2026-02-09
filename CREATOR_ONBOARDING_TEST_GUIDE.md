# Creator Onboarding Flow - Test Guide

## Overview

This guide walks through testing the complete Stripe Connect creator onboarding flow in SequenceHUB.

## Prerequisites

- ✅ Stripe TEST API keys configured in `.env.local`
- ✅ Dev server running (`npm run dev`)
- ✅ Database migrations applied
- ✅ At least one test user account (BUYER role)

## The Complete Flow

### Step 1: User Registers/Logs In

**As a new user:**
1. Go to `http://localhost:3000/auth/register`
2. Register with email: `creator-test@example.com`
3. Password: `Test1234!`
4. User is created with BUYER role by default

**As existing user:**
1. Go to `http://localhost:3000/auth/login`
2. Login with test credentials

### Step 2: Access Dashboard

1. After login, navigate to `http://localhost:3000/dashboard`
2. Since user is NOT a creator yet, you should see:
   - "Start Selling" card
   - "Connect Stripe to receive payouts" message
   - "Connect Stripe" button

### Step 3: Start Creator Onboarding

**Click "Connect Stripe" button**

This triggers `POST /api/creator/onboarding/start` which:
- ✅ Verifies user is authenticated
- ✅ Checks user doesn't already have CREATOR role
- ✅ Creates Stripe Connect Express account
- ✅ Creates `CreatorAccount` record in database
- ✅ Generates Stripe onboarding link
- ✅ Logs `STRIPE_ONBOARDING_STARTED` audit event
- ✅ Redirects to Stripe onboarding page

### Step 4: Complete Stripe Onboarding (TEST MODE)

You'll be redirected to Stripe's hosted onboarding page.

**For TEST mode, use these test values:**

**Personal Information:**
- First Name: `Test`
- Last Name: `Creator`
- Email: (pre-filled from your account)
- Phone: `000-000-0000`
- Date of Birth: `01/01/1990`

**Business Address:**
- Address Line 1: `123 Test Street`
- City: `San Francisco`
- State: `California`
- ZIP: `94102`
- Country: `United States`

**Bank Account (TEST mode accepts these):**
- Routing Number: `110000000` (Test routing number)
- Account Number: `000123456789` (Test account number)
- Account Holder Name: `Test Creator`

**SSN (for TEST mode):**
- SSN: `000-00-0000` (Test SSN - works in TEST mode only)

**Important:** In TEST mode, Stripe accepts these fake values for testing. In LIVE mode, real information would be required and verified.

### Step 5: Return to SequenceHUB

After completing the Stripe form, click "Done" or "Submit".

Stripe redirects to: `http://localhost:3000/api/creator/onboarding/return`

This endpoint:
- ✅ Verifies user is authenticated
- ✅ Retrieves creator account from database
- ✅ Calls Stripe API to check account status
- ✅ Updates `CreatorAccount.onboardingStatus` to `COMPLETED`
- ✅ **ASSIGNS CREATOR ROLE** to the user
- ✅ Logs `USER_UPGRADED_TO_CREATOR` audit event
- ✅ Redirects to `/dashboard/creator/onboarding?success=true`

### Step 6: Verify Creator Status

You'll land on the onboarding status page showing:
- ✅ Green checkmarks for all steps
- ✅ "Overall Status: COMPLETED"
- ✅ "Ready to Accept Payments: Yes"
- ✅ "Open Stripe Dashboard" button (to manage payouts)

### Step 7: Access Creator Dashboard

1. Navigate back to `http://localhost:3000/dashboard`
2. You should now see:
   - ✅ "Creator Dashboard" header
   - ✅ Stripe Connect card showing "Stripe is connected and ready for payouts"
   - ✅ Stats cards (Total Products, Sales, Revenue, Downloads)
   - ✅ "New Product" button in header
   - ✅ Creator navigation menu

**Navigation Menu Items (for CREATORS):**
- Overview (dashboard)
- Listings (products)
- Orders
- Payouts
- Support
- Settings

## Testing API Endpoints Directly

### Test 1: Start Onboarding (API)

```bash
# Login first to get cookie
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"creator-test@example.com","password":"Test1234!"}' \
  -c cookies.txt

# Start onboarding
curl -X POST http://localhost:3000/api/creator/onboarding/start \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  | jq

# Expected response:
# {
#   "success": true,
#   "stripeAccountId": "acct_xxxxxxxxxxxxx",
#   "onboardingUrl": "https://connect.stripe.com/setup/s/xxxxxxxxxxxxx"
# }
```

### Test 2: Check Onboarding Status (API)

```bash
curl http://localhost:3000/api/creator/onboarding/status \
  -b cookies.txt \
  | jq

# Expected response (before completing):
# {
#   "success": true,
#   "hasAccount": true,
#   "stripeAccountId": "acct_xxxxxxxxxxxxx",
#   "onboardingStatus": "IN_PROGRESS",
#   "isComplete": false,
#   "chargesEnabled": false,
#   "detailsSubmitted": false,
#   "capabilitiesActive": false,
#   "needsOnboarding": true,
#   "canReceivePayments": false
# }

# Expected response (after completing):
# {
#   "success": true,
#   "hasAccount": true,
#   "stripeAccountId": "acct_xxxxxxxxxxxxx",
#   "onboardingStatus": "COMPLETED",
#   "isComplete": true,
#   "chargesEnabled": true,
#   "detailsSubmitted": true,
#   "capabilitiesActive": true,
#   "needsOnboarding": false,
#   "canReceivePayments": true
# }
```

### Test 3: Get Stripe Dashboard Link (API)

```bash
# Only works AFTER onboarding is complete
curl http://localhost:3000/api/creator/onboarding/dashboard \
  -b cookies.txt \
  | jq

# Expected response:
# {
#   "success": true,
#   "dashboardUrl": "https://connect.stripe.com/express/xxxxxxxxxxxxx"
# }
```

## Database Verification

### Check Creator Account

```sql
-- In Supabase SQL Editor or psql
SELECT
  ca.*,
  u.email,
  u.name
FROM "CreatorAccount" ca
JOIN "User" u ON u.id = ca."userId"
WHERE u.email = 'creator-test@example.com';

-- Expected columns:
-- stripeAccountId: acct_xxxxxxxxxxxxx
-- onboardingStatus: COMPLETED
-- stripeAccountStatus: active
-- platformFeePercent: 10.0
```

### Check User Role Assignment

```sql
SELECT
  u.email,
  ur.role,
  ur."createdAt"
FROM "UserRole" ur
JOIN "User" u ON u.id = ur."userId"
WHERE u.email = 'creator-test@example.com';

-- Expected rows:
-- email: creator-test@example.com, role: BUYER, createdAt: (registration time)
-- email: creator-test@example.com, role: CREATOR, createdAt: (onboarding completion time)
```

### Check Audit Logs

```sql
SELECT
  action,
  "entityType",
  "entityId",
  "createdAt",
  metadata
FROM "AuditLog"
WHERE "userId" = (SELECT id FROM "User" WHERE email = 'creator-test@example.com')
ORDER BY "createdAt" DESC
LIMIT 10;

-- Expected entries:
-- USER_UPGRADED_TO_CREATOR
-- STRIPE_ONBOARDING_STARTED
-- (possibly STRIPE_DASHBOARD_ACCESSED if you clicked the dashboard link)
```

## Common Issues & Troubleshooting

### Issue 1: "Stripe Connect is not configured"

**Cause:** Missing or invalid Stripe API keys

**Fix:**
```bash
# Verify keys in .env.local
grep STRIPE .env.local

# Should show:
# STRIPE_SECRET_KEY=sk_test_51...
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...

# Test connection
node test-stripe-connection.js
```

### Issue 2: "Forbidden - Creator role required" on status check

**Cause:** Status endpoint incorrectly requires CREATOR role

**Fix:** Already fixed - status endpoint allows any authenticated user

### Issue 3: Onboarding link expired

**Cause:** Stripe onboarding links expire after 30 minutes

**Fix:**
- Click "Connect Stripe" button again to generate a new link
- The endpoint will use the existing Stripe account, just generate a new onboarding URL

### Issue 4: "You are already a creator"

**Cause:** User already has CREATOR role

**Solution:** This is expected - user should visit `/dashboard` instead

### Issue 5: CREATOR role not assigned after completing Stripe

**Cause:** Stripe webhook not firing or return endpoint not called

**Debug:**
1. Check browser network tab - should redirect to `/api/creator/onboarding/return`
2. Check server logs for audit log entries
3. Manually check Stripe account status:
   ```bash
   curl http://localhost:3000/api/creator/onboarding/status -b cookies.txt | jq
   ```
4. If `isComplete: true` but no CREATOR role, manually assign:
   ```sql
   INSERT INTO "UserRole" ("id", "userId", "role", "createdAt")
   VALUES (
     'manual_' || gen_random_uuid(),
     (SELECT id FROM "User" WHERE email = 'creator-test@example.com'),
     'CREATOR',
     NOW()
   );
   ```

## Test Stripe Dashboard Access

After onboarding completes:

1. Go to `/dashboard/creator/onboarding`
2. Click "Open Stripe Dashboard"
3. You'll be redirected to Stripe Express Dashboard
4. In TEST mode, you'll see:
   - Test payments
   - Test payouts
   - Test reports
   - Account settings

## Next Steps After Onboarding

Once a user completes onboarding and has CREATOR role:

1. ✅ Create products (`/dashboard/products/new`)
2. ✅ Upload xLights files (PHASE 2 - coming next)
3. ✅ Set product prices
4. ✅ Publish products for sale
5. ✅ View sales and payouts in dashboard

## Summary

**Successful Flow Checklist:**
- ✅ User registers/logs in with BUYER role
- ✅ Clicks "Connect Stripe" on dashboard
- ✅ Redirected to Stripe onboarding form
- ✅ Completes Stripe form with test data
- ✅ Returns to SequenceHUB
- ✅ CREATOR role automatically assigned
- ✅ CreatorAccount status set to COMPLETED
- ✅ Dashboard shows creator features
- ✅ Can access Stripe Express Dashboard
- ✅ Ready to create and sell products

**Database Changes:**
- ✅ New row in `CreatorAccount` table
- ✅ New row in `UserRole` table (role: CREATOR)
- ✅ 2+ new rows in `AuditLog` table

**Total Time:** ~3-5 minutes for complete flow in TEST mode

---

**Phase 1.2: Stripe Connect Onboarding Flow - COMPLETE** ✅
