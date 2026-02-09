/**
 * GET /api/creator/onboarding/return
 * Handles return from Stripe Connect onboarding
 * Verifies account status and assigns CREATOR role if successful
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { getCurrentUser, assignRole, createAuditLog } from '@/lib/auth';
import { db } from '@/lib/db';
import { getAccountStatus, updateCreatorAccountStatus } from '@/lib/stripe-connect';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login?error=unauthorized', request.url));
    }

    // 2. Get creator account from database
    const creatorAccount = await db.creatorAccount.findUnique({
      where: { userId: user.id },
    });

    if (!creatorAccount || !creatorAccount.stripeAccountId) {
      return NextResponse.redirect(
        new URL('/dashboard/creator/onboarding?error=no_account', request.url)
      );
    }

    // 3. Check Stripe account status
    const {
      account,
      isComplete,
      chargesEnabled,
      detailsSubmitted,
    } = await getAccountStatus(creatorAccount.stripeAccountId);

    // 4. Update creator account status in database
    await updateCreatorAccountStatus(creatorAccount.stripeAccountId, account);

    // 5. If onboarding is complete, assign CREATOR role
    if (isComplete && chargesEnabled) {
      const hasCreatorRole = user.roles.some((r) => r.role === 'CREATOR');

      if (!hasCreatorRole) {
        // Assign CREATOR role
        await assignRole(user.id, 'CREATOR');

        await createAuditLog({
          userId: user.id,
          action: 'USER_UPGRADED_TO_CREATOR',
          entityType: 'user_role',
          entityId: user.id,
          metadata: JSON.stringify({
            stripeAccountId: creatorAccount.stripeAccountId,
            completedAt: new Date().toISOString(),
          }),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        });

        // Redirect to success page
        return NextResponse.redirect(
          new URL('/dashboard/creator/onboarding?success=true', request.url)
        );
      }

      // Already has CREATOR role, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // 6. Onboarding not complete yet
    if (detailsSubmitted) {
      // Details submitted but not yet verified
      return NextResponse.redirect(
        new URL('/dashboard/creator/onboarding?status=pending', request.url)
      );
    }

    // Onboarding abandoned or incomplete
    return NextResponse.redirect(
      new URL('/dashboard/creator/onboarding?status=incomplete', request.url)
    );
  } catch (error) {
    console.error('Error processing onboarding return:', error);

    const user = await getCurrentUser();
    if (user) {
      await createAuditLog({
        userId: user.id,
        action: 'SECURITY_ALERT',
        entityType: 'creator_account',
        metadata: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          action: 'onboarding_return_failed',
        }),
      });
    }

    return NextResponse.redirect(
      new URL('/dashboard/creator/onboarding?error=processing', request.url)
    );
  }
}
