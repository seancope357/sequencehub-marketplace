/**
 * GET /api/creator/onboarding/status
 * Check the onboarding completion status for the current creator
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { db } from '@/lib/db';
import { getAccountStatus, getStripeConfigStatus, StripeConfigError } from '@/lib/stripe-connect';

export async function GET(request: NextRequest) {
  try {
    const stripeConfig = getStripeConfigStatus();
    if (!stripeConfig.configured) {
      return NextResponse.json(
        {
          success: true,
          stripeConfigured: false,
          message: stripeConfig.message,
          hasAccount: false,
          onboardingStatus: 'DISABLED',
          isComplete: false,
          chargesEnabled: false,
          detailsSubmitted: false,
          capabilitiesActive: false,
          needsOnboarding: false,
          canReceivePayments: false,
        },
        { status: 200 }
      );
    }

    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get creator account from database
    const creatorAccount = await db.creatorAccount.findUnique({
      where: { userId: user.id },
    });

    // If no account exists, return pending status
    if (!creatorAccount) {
      return NextResponse.json(
        {
          success: true,
          stripeConfigured: true,
          hasAccount: false,
          onboardingStatus: 'PENDING',
          isComplete: false,
          chargesEnabled: false,
          detailsSubmitted: false,
          capabilitiesActive: false,
          needsOnboarding: true,
          canReceivePayments: false,
        },
        { status: 200 }
      );
    }

    // If account exists but no Stripe account ID, return pending
    if (!creatorAccount.stripeAccountId) {
      return NextResponse.json(
        {
          success: true,
          stripeConfigured: true,
          hasAccount: true,
          onboardingStatus: creatorAccount.onboardingStatus,
          isComplete: false,
          chargesEnabled: false,
          detailsSubmitted: false,
          capabilitiesActive: false,
          needsOnboarding: true,
          canReceivePayments: false,
        },
        { status: 200 }
      );
    }

    // 4. Check current status with Stripe
    try {
      const {
        isComplete,
        chargesEnabled,
        detailsSubmitted,
        capabilitiesActive,
      } = await getAccountStatus(creatorAccount.stripeAccountId);

      // 5. Return comprehensive status
      return NextResponse.json(
        {
          success: true,
          stripeConfigured: true,
          hasAccount: true,
          stripeAccountId: creatorAccount.stripeAccountId,
          onboardingStatus: creatorAccount.onboardingStatus,
          isComplete,
          chargesEnabled,
          detailsSubmitted,
          capabilitiesActive,
          needsOnboarding: !isComplete,
          canReceivePayments: chargesEnabled && isComplete,
        },
        { status: 200 }
      );
    } catch (stripeError) {
      const message =
        stripeError instanceof StripeConfigError
          ? stripeError.message
          : stripeError instanceof Error
          ? stripeError.message
          : 'Stripe error';

      return NextResponse.json(
        {
          success: true,
          stripeConfigured: true,
          hasAccount: true,
          stripeAccountId: creatorAccount.stripeAccountId,
          onboardingStatus: creatorAccount.onboardingStatus,
          isComplete: false,
          chargesEnabled: false,
          detailsSubmitted: false,
          capabilitiesActive: false,
          needsOnboarding: true,
          canReceivePayments: false,
          stripeError: message,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Error checking onboarding status:', error);

    return NextResponse.json(
      {
        error: 'Failed to check onboarding status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
