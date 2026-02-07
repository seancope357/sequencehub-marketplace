import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUser } from '@/lib/supabase/auth';
import { isAdmin } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { getStripeConfigStatus } from '@/lib/stripe-connect';

const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2024-12-18.acacia';
let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Stripe is not configured.');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  }

  return stripeClient;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(currentUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const stripeConfig = getStripeConfigStatus();
    if (!stripeConfig.configured) {
      return NextResponse.json(
        { error: stripeConfig.message || 'Stripe is not configured.' },
        { status: 409 }
      );
    }

    const order = await db.order.findUnique({
      where: { id: params.orderId },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!order.paymentIntentId) {
      return NextResponse.json(
        { error: 'Order does not have a payment intent to refund.' },
        { status: 400 }
      );
    }

    if (order.status === 'REFUNDED') {
      return NextResponse.json(
        { error: 'Order has already been refunded.' },
        { status: 409 }
      );
    }

    const stripe = getStripeClient();
    const refund = await stripe.refunds.create({
      payment_intent: order.paymentIntentId,
    });

    const refundedAmount = refund.amount / 100;
    const isFullRefund = refundedAmount >= order.totalAmount;

    await db.order.update({
      where: { id: order.id },
      data: {
        status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        refundedAmount: { increment: refundedAmount },
        refundedAt: new Date(),
      },
    });

    if (isFullRefund) {
      await db.entitlement.updateMany({
        where: { orderId: order.id },
        data: { isActive: false },
      });
    }

    await db.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'ORDER_REFUNDED',
        entityType: 'order',
        entityId: order.id,
        metadata: {
          refundId: refund.id,
          amount: refundedAmount,
          fullRefund: isFullRefund,
          paymentIntentId: order.paymentIntentId,
        },
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    });

    return NextResponse.json(
      {
        success: true,
        refundId: refund.id,
        amount: refundedAmount,
        fullRefund: isFullRefund,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin refund error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
