/**
 * GET /api/creator/onboarding/dashboard
 * Generate a link to the Stripe Express Dashboard for completed accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { isCreatorOrAdmin } from '@/lib/auth-utils';
import { getCurrentUser, createAuditLog } from '@/lib/supabase/auth';
import { db } from '@/lib/db';
import { createExpressDashboardLink } from '@/lib/stripe-connect';

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

    // 3. Get creator account
    const creatorAccount = await db.creatorAccount.findUnique({
      where: { userId: user.id },
    });

    if (!creatorAccount || !creatorAccount.stripeAccountId) {
      return NextResponse.json(
        { error: 'No Stripe account found - complete onboarding first' },
        { status: 400 }
      );
    }

    // 4. Check if onboarding is complete
    if (creatorAccount.onboardingStatus !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Onboarding not complete - finish setup first' },
        { status: 400 }
      );
    }

    // 5. Generate Express Dashboard link
    const dashboardUrl = await createExpressDashboardLink(creatorAccount.stripeAccountId);

    // 6. Log dashboard access
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

    // 7. Return dashboard URL
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
