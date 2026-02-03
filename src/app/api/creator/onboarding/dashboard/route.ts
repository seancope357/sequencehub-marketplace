/**
 * GET /api/creator/onboarding/dashboard
 * Generate a link to the Stripe Express Dashboard for completed accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createAuditLog } from '@/lib/supabase/auth';
import { db } from '@/lib/db';
import { createExpressDashboardLink, getStripeConfigStatus } from '@/lib/stripe-connect';

export async function GET(request: NextRequest) {
  try {
    const stripeConfig = getStripeConfigStatus();
    if (!stripeConfig.configured) {
      return NextResponse.json(
        { error: stripeConfig.message || 'Stripe Connect is not configured.' },
        { status: 409 }
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

    // 2. Get creator account
    const creatorAccount = await db.creatorAccount.findUnique({
      where: { userId: user.id },
    });

    if (!creatorAccount || !creatorAccount.stripeAccountId) {
      return NextResponse.json(
        { error: 'No Stripe account found - complete onboarding first' },
        { status: 400 }
      );
    }

    // 3. Check if onboarding is complete
    if (creatorAccount.onboardingStatus !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Onboarding not complete - finish setup first' },
        { status: 400 }
      );
    }

    // 4. Generate Express Dashboard link
    const dashboardUrl = await createExpressDashboardLink(creatorAccount.stripeAccountId);

    // 5. Log dashboard access
    await createAuditLog({
      userId: user.id,
      action: 'STRIPE_DASHBOARD_ACCESSED',
      entityType: 'creator_account',
      entityId: creatorAccount.stripeAccountId,
      metadata: JSON.stringify({
        accessedAt: new Date().toISOString(),
      }),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // 6. Return dashboard URL
    return NextResponse.json(
      {
        success: true,
        dashboardUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error generating dashboard link:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate dashboard link',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
