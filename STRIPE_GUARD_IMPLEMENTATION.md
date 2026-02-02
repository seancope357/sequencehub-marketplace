# Stripe Connect Onboarding Guard Implementation

This document provides the exact code needed to add Stripe Connect verification to the product creation page.

---

## Problem

Users can currently create products without setting up Stripe Connect, which means:
- They cannot receive payments for their products
- They'll be confused when sales don't result in payouts
- Support burden increases

---

## Solution

Add a guard component to `/dashboard/products/new` that:
1. Checks if the user has completed Stripe Connect onboarding
2. Shows a prominent alert if not connected
3. Provides a clear call-to-action to set up Stripe
4. Optionally prevents product creation until Stripe is set up

---

## Implementation

### Option 1: Alert Banner (Recommended for MVP)

This option shows a warning but still allows product creation. Good for testing and flexibility.

**File**: `/Users/cope/SHUB-V1/src/app/dashboard/products/new/page.tsx`

**Add this state variable** (around line 60, with other state):

```typescript
const [stripeStatus, setStripeStatus] = useState<{
  isConnected: boolean;
  isLoading: boolean;
}>({ isConnected: false, isLoading: true });
```

**Add this useEffect** (around line 92, after the auth check):

```typescript
// Check Stripe Connect status
useEffect(() => {
  if (!isAuthenticated || !user) return;

  const checkStripeStatus = async () => {
    try {
      const response = await fetch('/api/creator/onboarding/status');
      if (response.ok) {
        const data = await response.json();
        setStripeStatus({
          isConnected: data.isConnected && data.onboardingComplete,
          isLoading: false,
        });
      } else {
        setStripeStatus({ isConnected: false, isLoading: false });
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
      setStripeStatus({ isConnected: false, isLoading: false });
    }
  };

  checkStripeStatus();
}, [isAuthenticated, user]);
```

**Add this alert banner** (right after the header, around line 260):

```typescript
{/* Stripe Connect Warning Banner */}
{!stripeStatus.isLoading && !stripeStatus.isConnected && (
  <div className="container mx-auto px-4 py-4">
    <div className="max-w-5xl mx-auto">
      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              Stripe Connect Not Set Up
            </h3>
            <p className="text-yellow-800 mb-4">
              You haven't connected your Stripe account yet. While you can create
              and save products, you won't be able to receive payments until you
              complete Stripe Connect onboarding.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => window.location.href = '/dashboard/creator/onboarding'}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Set Up Payments Now
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Dismiss the banner (you could save this preference to localStorage)
                  setStripeStatus({ ...stripeStatus, isConnected: true });
                }}
              >
                I'll do this later
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
```

**Visual indicator in header** (optional, add to header section around line 240):

```typescript
{/* Add this after the "New Product" title */}
{!stripeStatus.isLoading && !stripeStatus.isConnected && (
  <Badge variant="destructive" className="ml-2">
    Payments Not Set Up
  </Badge>
)}
```

---

### Option 2: Modal Blocker (More Strict)

This option completely prevents product creation until Stripe is set up. Better for production but more restrictive.

**Add the same state and useEffect from Option 1**

**Then add this blocking modal** (replace the main content):

```typescript
{!stripeStatus.isLoading && !stripeStatus.isConnected ? (
  // Blocking Modal
  <div className="container mx-auto px-4 py-8">
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">
            Set Up Payments to Create Products
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            Before you can create and sell products on SequenceHUB, you need to
            connect your Stripe account to receive payments.
          </p>

          <div className="bg-muted p-4 rounded-lg space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              What you'll need:
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground ml-7">
              <li>• Business or personal banking information</li>
              <li>• Tax identification number (SSN or EIN)</li>
              <li>• 5-10 minutes to complete the form</li>
            </ul>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Secure & Fast:</strong> We use Stripe Connect, the same payment
              platform trusted by millions of businesses worldwide. Your information
              is encrypted and secure.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1"
              size="lg"
              onClick={() => window.location.href = '/dashboard/creator/onboarding'}
            >
              <DollarSign className="h-5 w-5 mr-2" />
              Connect Stripe Account
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/dashboard'}
            >
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
) : (
  // Normal product creation form (existing code)
  <div className="container mx-auto px-4 py-8">
    {/* ... existing form content ... */}
  </div>
)}
```

---

## Testing

After implementing the guard:

1. **Test as new user (no Stripe)**:
   ```bash
   # Start dev server
   bun run dev

   # Register new account
   # Navigate to /dashboard/products/new
   # Verify warning/modal appears
   ```

2. **Test Stripe Connect flow**:
   ```bash
   # Click "Set Up Payments" button
   # Verify redirect to /dashboard/creator/onboarding
   # Complete Stripe onboarding (test mode)
   # Return to product creation page
   # Verify warning disappears
   ```

3. **Test with connected user**:
   ```bash
   # User with Stripe already connected
   # Navigate to /dashboard/products/new
   # Verify NO warning appears
   # Form should work normally
   ```

---

## Dashboard Stripe Status Indicator

**Optional Enhancement**: Add Stripe connection status to the main dashboard.

**File**: `/Users/cope/SHUB-V1/src/app/dashboard/page.tsx`

**Add this card** to the dashboard stats section:

```typescript
<Card>
  <CardHeader>
    <CardTitle className="flex items-center justify-between">
      <span>Payment Status</span>
      {stripeConnected ? (
        <Badge variant="default" className="bg-green-600">
          <Check className="h-3 w-3 mr-1" />
          Connected
        </Badge>
      ) : (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Not Set Up
        </Badge>
      )}
    </CardTitle>
  </CardHeader>
  <CardContent>
    {stripeConnected ? (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Your Stripe account is connected and ready to receive payments.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = '/dashboard/creator/onboarding'}
        >
          Manage Payment Settings
        </Button>
      </div>
    ) : (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Connect your Stripe account to start selling and receiving payments.
        </p>
        <Button
          size="sm"
          onClick={() => window.location.href = '/dashboard/creator/onboarding'}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Set Up Payments
        </Button>
      </div>
    )}
  </CardContent>
</Card>
```

---

## API Endpoint Verification

The implementation above assumes the Stripe status endpoint exists. Verify it's working:

**Test the endpoint**:
```bash
# While logged in, test in browser console:
fetch('/api/creator/onboarding/status')
  .then(r => r.json())
  .then(console.log)

# Expected response:
# {
#   isConnected: boolean,
#   onboardingComplete: boolean,
#   accountId: string | null,
#   payoutsEnabled: boolean
# }
```

**If the endpoint doesn't exist**, create it at:
**File**: `/Users/cope/SHUB-V1/src/app/api/creator/onboarding/status/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get creator account status
    const { data: creatorAccount, error: dbError } = await supabase
      .from('creator_accounts')
      .select('stripe_account_id, stripe_onboarding_complete, stripe_payouts_enabled')
      .eq('user_id', user.id)
      .single();

    if (dbError) {
      // No creator account yet - return not connected
      return NextResponse.json({
        isConnected: false,
        onboardingComplete: false,
        accountId: null,
        payoutsEnabled: false,
      });
    }

    return NextResponse.json({
      isConnected: !!creatorAccount.stripe_account_id,
      onboardingComplete: creatorAccount.stripe_onboarding_complete || false,
      accountId: creatorAccount.stripe_account_id,
      payoutsEnabled: creatorAccount.stripe_payouts_enabled || false,
    });

  } catch (error) {
    console.error('Error checking Stripe status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Additional Improvements

### 1. Prevent Publishing Without Stripe

In the `handleSave` function, add this check before publishing:

```typescript
const handleSave = async (publish: boolean = false) => {
  // ... existing validation ...

  // Prevent publishing without Stripe
  if (publish && !stripeStatus.isConnected) {
    toast.error(
      'You must connect your Stripe account before publishing products',
      {
        action: {
          label: 'Set Up Stripe',
          onClick: () => window.location.href = '/dashboard/creator/onboarding',
        },
      }
    );
    return;
  }

  // ... rest of function ...
};
```

### 2. Add Stripe Status to Settings Page

**File**: `/Users/cope/SHUB-V1/src/app/dashboard/settings/page.tsx`

Add a "Payment Settings" section showing Stripe connection status and link to onboarding.

### 3. Show Stripe Reminder in Dashboard Products List

**File**: `/Users/cope/SHUB-V1/src/app/dashboard/products/page.tsx`

If user has products but no Stripe:
```typescript
{products.length > 0 && !stripeConnected && (
  <Alert variant="warning">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Payment Setup Required</AlertTitle>
    <AlertDescription>
      You have products but haven't set up Stripe.
      <a href="/dashboard/creator/onboarding">Connect now</a> to start receiving payments.
    </AlertDescription>
  </Alert>
)}
```

---

## Acceptance Criteria

- [ ] Warning displays when Stripe is not connected
- [ ] "Set Up Payments" button redirects to onboarding page
- [ ] Warning disappears after Stripe is connected
- [ ] Cannot publish products without Stripe (optional)
- [ ] Dashboard shows Stripe connection status
- [ ] All Stripe status checks work correctly

---

## Troubleshooting

**Issue**: Alert always shows "Not connected" even after Stripe setup

**Solution**:
1. Check that Stripe onboarding actually completed
2. Verify `creator_accounts` table has correct data
3. Check API endpoint returns correct status
4. Clear browser cache/cookies

**Issue**: API endpoint returns 401 Unauthorized

**Solution**:
1. Verify user is logged in
2. Check auth cookies are present
3. Test with different browser/incognito

**Issue**: Infinite loading state

**Solution**:
1. Add error handling to catch failed API calls
2. Set timeout on API requests
3. Add fallback state after 5 seconds

---

## Next Steps

After implementing this guard:

1. Test thoroughly with new and existing users
2. Complete Stripe Connect onboarding flow
3. Test end-to-end payment processing
4. Deploy to production

---

**Last Updated**: February 1, 2026
**Status**: Ready for Implementation
**Estimated Time**: 30 minutes
