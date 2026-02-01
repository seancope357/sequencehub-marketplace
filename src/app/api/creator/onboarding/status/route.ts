/**
 * GET /api/creator/onboarding/status
 * Check the onboarding completion status for the current creator
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isCreatorOrAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { getAccountStatus } from '@/lib/stripe-connect';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Verify user has CREATOR role
    if (!isCreatorOrAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Creator role required' },
        { status: 403 }
      );
    }

    // 3. Get creator account from database
    const creatorAccount = await db.creatorAccount.findUnique({
      where: { userId: user.id },
    });

    // If no account exists, return pending status
    if (!creatorAccount) {
      return NextResponse.json(
        {
          success: true,
          hasAccount: false,
          onboardingStatus: 'PENDING',
          needsOnboarding: true,
        },
        { status: 200 }
      );
    }

    // If account exists but no Stripe account ID, return pending
    if (!creatorAccount.stripeAccountId) {
      return NextResponse.json(
        {
          success: true,
          hasAccount: true,
          onboardingStatus: creatorAccount.onboardingStatus,
          needsOnboarding: true,
        },
        { status: 200 }
      );
    }

    // 4. Check current status with Stripe
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
