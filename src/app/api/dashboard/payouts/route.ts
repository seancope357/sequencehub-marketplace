import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { requireCreatorOrAdminUser } from '@/lib/auth/guards';
import { getAccountStatus, getStripeConfigStatus } from '@/lib/stripe-connect';
import { internalServerError } from '@/lib/api/errors';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireCreatorOrAdminUser();
    if (authResult.response) {
      return authResult.response;
    }
    const { user } = authResult;

    const limitResult = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.STATS_QUERY,
      byUser: true,
      byIp: false,
      message: 'Payout status query rate limit exceeded. Please try again later.',
    });
    if (!limitResult.allowed) {
      return limitResult.response;
    }

    const stripeConfig = getStripeConfigStatus();
    const creatorAccount = await db.creatorAccount.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        stripeAccountId: true,
        stripeAccountStatus: true,
        onboardingStatus: true,
        totalRevenue: true,
        totalSales: true,
        payoutSchedule: true,
        updatedAt: true,
      },
    });

    const revenueAggregate = await db.orderItem.aggregate({
      where: {
        product: {
          creatorId: user.id,
        },
      },
      _sum: {
        priceAtPurchase: true,
      },
      _count: {
        id: true,
      },
    });

    if (!stripeConfig.configured) {
      return NextResponse.json({
        stripeConfigured: false,
        canReceivePayments: false,
        hasAccount: Boolean(creatorAccount?.stripeAccountId),
        onboardingStatus: creatorAccount?.onboardingStatus || 'PENDING',
        message: stripeConfig.message || 'Stripe is not configured for this environment.',
        revenue: {
          grossSales: revenueAggregate._sum.priceAtPurchase ?? 0,
          totalSales: revenueAggregate._count.id,
        },
      });
    }

    if (!creatorAccount?.stripeAccountId) {
      return NextResponse.json({
        stripeConfigured: true,
        hasAccount: false,
        canReceivePayments: false,
        onboardingStatus: creatorAccount?.onboardingStatus || 'PENDING',
        payoutSchedule: creatorAccount?.payoutSchedule || null,
        revenue: {
          grossSales: revenueAggregate._sum.priceAtPurchase ?? 0,
          totalSales: revenueAggregate._count.id,
        },
      });
    }

    try {
      const stripeStatus = await getAccountStatus(creatorAccount.stripeAccountId);

      return NextResponse.json({
        stripeConfigured: true,
        hasAccount: true,
        stripeAccountId: creatorAccount.stripeAccountId,
        stripeAccountStatus: creatorAccount.stripeAccountStatus,
        onboardingStatus: creatorAccount.onboardingStatus,
        canReceivePayments: stripeStatus.isComplete && stripeStatus.chargesEnabled,
        isComplete: stripeStatus.isComplete,
        chargesEnabled: stripeStatus.chargesEnabled,
        detailsSubmitted: stripeStatus.detailsSubmitted,
        capabilitiesActive: stripeStatus.capabilitiesActive,
        payoutSchedule: creatorAccount.payoutSchedule,
        lastAccountSyncAt: creatorAccount.updatedAt,
        revenue: {
          grossSales: revenueAggregate._sum.priceAtPurchase ?? 0,
          totalSales: revenueAggregate._count.id,
        },
      });
    } catch (stripeError) {
      console.error('Error fetching Stripe account status:', stripeError);

      return NextResponse.json({
        stripeConfigured: true,
        hasAccount: true,
        stripeAccountId: creatorAccount.stripeAccountId,
        onboardingStatus: creatorAccount.onboardingStatus,
        canReceivePayments: false,
        stripeError: 'Unable to fetch live Stripe account status.',
        payoutSchedule: creatorAccount.payoutSchedule,
        lastAccountSyncAt: creatorAccount.updatedAt,
        revenue: {
          grossSales: revenueAggregate._sum.priceAtPurchase ?? 0,
          totalSales: revenueAggregate._count.id,
        },
      });
    }
  } catch (error) {
    console.error('Error fetching seller payout status:', error);
    return internalServerError();
  }
}
