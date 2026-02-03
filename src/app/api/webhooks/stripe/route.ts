import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/supabase/auth';
import { sendPurchaseConfirmation, sendSaleNotification } from '@/lib/email/send';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // V2 API: Handle thin events by fetching full event data
    // Thin events only contain minimal data - we need to fetch the complete event
    if (event.data && 'object' in event.data && event.data.object === 'event') {
      console.log('[Webhook] Detected thin event, fetching full event data...');
      try {
        event = await stripe.events.retrieve(event.id);
        console.log('[Webhook] Successfully fetched full event data');
      } catch (error) {
        console.error('[Webhook] Failed to fetch full event data:', error);
        // Continue with thin event if fetch fails (graceful degradation)
      }
    }

    // Log webhook received
    await createAuditLog({
      action: 'STRIPE_WEBHOOK_RECEIVED',
      entityType: 'webhook',
      entityId: event.id,
      metadata: JSON.stringify({
        type: event.type,
        id: event.id,
        created: event.created,
        isThinEvent: event.data && 'object' in event.data && event.data.object === 'event',
      }),
    });

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      case 'account.application.deauthorized':
        await handleAccountDeauthorized(event.data.object as Stripe.Account);
        break;

      case 'capability.updated':
        await handleCapabilityUpdated(event.data.object as Stripe.Capability);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Log webhook processed
    await createAuditLog({
      action: 'STRIPE_WEBHOOK_PROCESSED',
      entityType: 'webhook',
      entityId: event.id,
      metadata: JSON.stringify({
        type: event.type,
        status: 'success',
      }),
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);

    // Log webhook failure
    await createAuditLog({
      action: 'STRIPE_WEBHOOK_FAILED',
      entityType: 'webhook',
      metadata: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    });

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const { productId, userId } = session.metadata as {
    productId: string;
    userId: string;
  };

  // Find checkout session record
  const checkoutSession = await db.checkoutSession.findUnique({
    where: { sessionId: session.id },
  });

  if (checkoutSession?.status === 'COMPLETED') {
    console.log('Checkout session already processed, skipping');
    return; // Idempotency - already processed
  }

  if (!checkoutSession) {
    console.error('Checkout session not found:', session.id);
    return;
  }

  // Get product and version info
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      versions: {
        where: { isLatest: true },
        take: 1,
      },
      creator: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  if (!product) {
    console.error('Product not found:', productId);
    return;
  }

  const version = product.versions[0];
  if (!version) {
    console.error('No version found for product:', productId);
    return;
  }

  // Create order
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const order = await db.order.create({
    data: {
      orderNumber,
      userId,
      totalAmount: checkoutSession.amount,
      currency: checkoutSession.currency,
      status: 'COMPLETED',
      paymentIntentId: session.payment_intent as string,
      utmSource: null, // Could be extracted from session.metadata
      utmMedium: null,
      utmCampaign: null,
    },
  });

  // Create order item
  const orderItem = await db.orderItem.create({
    data: {
      orderId: order.id,
      productId,
      versionId: version.id,
      priceId: checkoutSession.priceId,
      priceAtPurchase: checkoutSession.amount,
      currency: checkoutSession.currency,
    },
  });

  // Create entitlement
  await db.entitlement.create({
    data: {
      userId,
      orderId: order.id,
      productId,
      versionId: version.id,
      licenseType: product.licenseType,
      isActive: true,
    },
  });

  // Update checkout session status
  await db.checkoutSession.update({
    where: { sessionId: session.id },
    data: {
      status: 'COMPLETED',
      updatedAt: new Date(),
    },
  });

  // Update product sale count
  await db.product.update({
    where: { id: productId },
    data: {
      saleCount: { increment: 1 },
    },
  });

  // Create audit log
  await createAuditLog({
    userId,
    orderId: order.id,
    action: 'ORDER_CREATED',
    entityType: 'order',
    entityId: order.id,
    metadata: JSON.stringify({
      orderNumber,
      productId,
      amount: checkoutSession.amount,
    }),
  });

  console.log('Checkout session processed successfully:', orderNumber);

  // Fetch buyer information for email
  const buyer = await db.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
    },
  });

  if (buyer) {
    // Send purchase confirmation to buyer (fire and forget)
    sendPurchaseConfirmation({
      recipientEmail: buyer.email,
      recipientName: buyer.name || undefined,
      orderNumber,
      productName: product.title,
      productSlug: product.slug,
      creatorName: product.creator.name || 'the creator',
      totalAmount: checkoutSession.amount,
      currency: checkoutSession.currency,
      purchaseDate: new Date(),
      libraryUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/library`,
      licenseType: product.licenseType,
      downloadUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/library`,
    }).catch((error) => {
      console.error('Failed to send purchase confirmation email:', error);
    });

    // Calculate platform fee and net earnings for creator email
    const platformFeePercent = 10; // Default platform fee
    const platformFeeAmount = (checkoutSession.amount * platformFeePercent) / 100;
    const netEarnings = checkoutSession.amount - platformFeeAmount;

    // Send sale notification to creator (fire and forget)
    sendSaleNotification({
      recipientEmail: product.creator.email,
      recipientName: product.creator.name || undefined,
      orderNumber,
      productName: product.title,
      productSlug: product.slug,
      buyerName: buyer.name || undefined,
      saleAmount: checkoutSession.amount,
      platformFeeAmount,
      netEarnings,
      currency: checkoutSession.currency,
      saleDate: new Date(),
      dashboardUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
    }).catch((error) => {
      console.error('Failed to send sale notification email:', error);
    });
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment intent succeeded:', paymentIntent.id);
  // This is mainly for logging and additional processing if needed
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log('Charge refunded:', charge.id);

  const paymentIntentId = charge.payment_intent as string;

  // Find order by payment intent
  const order = await db.order.findFirst({
    where: {
      paymentIntentId: paymentIntentId as string,
    },
  });

  if (!order) {
    console.error('Order not found for refunded charge:', charge.id);
    return;
  }

  // Update order status
  await db.order.update({
    where: { id: order.id },
    data: {
      status: 'REFUNDED',
      refundedAmount: { increment: charge.amount_refunded / 100 },
      refundedAt: new Date(),
    },
  });

  // Deactivate entitlements
  await db.entitlement.updateMany({
    where: {
      orderId: order.id,
    },
    data: {
      isActive: false,
    },
  });

  // Create audit log
  await createAuditLog({
    action: 'REFUND_INITIATED',
    entityType: 'order',
    entityId: order.id,
    changes: JSON.stringify({
      refundedAmount: charge.amount_refunded / 100,
    }),
  });
}

async function handleAccountUpdated(account: Stripe.Account) {
  console.log('Account updated:', account.id);

  // Find creator account by Stripe account ID
  const creatorAccount = await db.creatorAccount.findUnique({
    where: { stripeAccountId: account.id },
  });

  if (!creatorAccount) {
    console.error('Creator account not found for Stripe account:', account.id);
    return;
  }

  // Determine onboarding status
  const isComplete = Boolean(
    account.details_submitted &&
    account.charges_enabled &&
    account.payouts_enabled
  );

  const onboardingStatus = isComplete
    ? 'COMPLETED'
    : account.details_submitted
    ? 'IN_PROGRESS'
    : 'PENDING';

  // Update creator account
  await db.creatorAccount.update({
    where: { stripeAccountId: account.id },
    data: {
      stripeAccountStatus: account.charges_enabled ? 'active' : 'pending',
      onboardingStatus,
      updatedAt: new Date(),
    },
  });

  // Create audit log
  await createAuditLog({
    userId: creatorAccount.userId,
    action: 'STRIPE_ACCOUNT_UPDATED',
    entityType: 'creator_account',
    entityId: account.id,
    metadata: JSON.stringify({
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      onboardingStatus,
    }),
  });

  console.log('Creator account updated:', {
    userId: creatorAccount.userId,
    onboardingStatus,
  });
}

async function handleAccountDeauthorized(account: Stripe.Account) {
  console.log('Account deauthorized:', account.id);

  // Find creator account
  const creatorAccount = await db.creatorAccount.findUnique({
    where: { stripeAccountId: account.id },
  });

  if (!creatorAccount) {
    console.error('Creator account not found for deauthorization:', account.id);
    return;
  }

  // Update account to suspended status
  await db.creatorAccount.update({
    where: { stripeAccountId: account.id },
    data: {
      stripeAccountStatus: 'deauthorized',
      onboardingStatus: 'SUSPENDED',
      updatedAt: new Date(),
    },
  });

  // Create audit log
  await createAuditLog({
    userId: creatorAccount.userId,
    action: 'SECURITY_ALERT',
    entityType: 'creator_account',
    entityId: account.id,
    metadata: JSON.stringify({
      event: 'account_deauthorized',
      reason: 'Creator disconnected Stripe account',
    }),
  });

  console.log('Creator account deauthorized:', creatorAccount.userId);
}

async function handleCapabilityUpdated(capability: Stripe.Capability) {
  console.log('Capability updated:', capability.id);

  // Extract account ID from capability
  const accountId = capability.account as string;

  // Find creator account
  const creatorAccount = await db.creatorAccount.findUnique({
    where: { stripeAccountId: accountId },
  });

  if (!creatorAccount) {
    console.error('Creator account not found for capability update:', accountId);
    return;
  }

  // Create audit log for capability changes
  await createAuditLog({
    userId: creatorAccount.userId,
    action: 'STRIPE_CAPABILITY_UPDATED',
    entityType: 'creator_account',
    entityId: accountId,
    metadata: JSON.stringify({
      capabilityId: capability.id,
      status: capability.status,
      requirements: capability.requirements,
    }),
  });

  console.log('Capability updated for account:', {
    accountId,
    status: capability.status,
  });
}
