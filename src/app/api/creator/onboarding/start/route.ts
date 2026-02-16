/**
 * POST /api/creator/onboarding/start
 * Initialize Stripe Connect Express onboarding for any authenticated user
 * Note: User does NOT need CREATOR role yet - role is assigned after successful onboarding
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createAuditLog } from '@/lib/auth';
import { initializeCreatorAccount } from '@/lib/stripe-connect';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user (no role check needed - anyone can become a creator)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Check if user already has CREATOR role
    const hasCreatorRole = user.roles.includes('CREATOR');
    if (hasCreatorRole) {
      return NextResponse.json(
        { error: 'You are already a creator. Visit your dashboard to manage your products.' },
        { status: 400 }
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
