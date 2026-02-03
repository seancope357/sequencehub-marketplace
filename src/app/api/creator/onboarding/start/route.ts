/**
 * POST /api/creator/onboarding/start
 * Initialize Stripe Connect Express onboarding for a creator
 */

import { NextRequest, NextResponse } from 'next/server';
import { isCreatorOrAdmin } from '@/lib/supabase/auth-utils';
import { getCurrentUser, createAuditLog } from '@/lib/supabase/auth';
import { initializeCreatorAccount } from '@/lib/stripe-connect';

export async function POST(request: NextRequest) {
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

    // 3. Initialize Stripe Connect account
    const { stripeAccountId, onboardingUrl } = await initializeCreatorAccount(
      user.id,
      user.email
    );

    // 4. Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'STRIPE_ONBOARDING_STARTED',
      entityType: 'creator_account',
      entityId: stripeAccountId,
      metadata: JSON.stringify({
        stripeAccountId,
        initiatedAt: new Date().toISOString(),
      }),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // 5. Return onboarding URL
    return NextResponse.json(
      {
        success: true,
        stripeAccountId,
        onboardingUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error starting creator onboarding:', error);

    // Log failure
    const user = await getCurrentUser();
    if (user) {
      await createAuditLog({
        userId: user.id,
        action: 'SECURITY_ALERT',
        entityType: 'creator_account',
        metadata: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          action: 'onboarding_start_failed',
        }),
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to start onboarding',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
