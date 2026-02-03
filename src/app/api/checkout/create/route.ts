import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { db } from '@/lib/db';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import Stripe from 'stripe';
import { getStripeConfigStatus, StripeConfigError } from '@/lib/stripe-connect';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const stripeConfig = getStripeConfigStatus();
    if (!stripeConfig.configured) {
      return NextResponse.json(
        { error: stripeConfig.message || 'Stripe Connect is not configured.' },
        { status: 409 }
      );
    }

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Apply rate limiting: 10 checkout sessions per hour per user
    const limitResult = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.CHECKOUT_CREATE,
      byUser: true,
      byIp: false,
      message: 'Too many checkout attempts. Please try again later.',
    });

    if (!limitResult.allowed) {
      return limitResult.response;
    }

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Get product with price and creator info
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        prices: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        creator: {
          include: {
            creatorAccount: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (product.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Product is not available for purchase' },
        { status: 400 }
      );
    }

    const price = product.prices[0];
    if (!price) {
      return NextResponse.json(
        { error: 'Product price not found' },
        { status: 404 }
      );
    }

    // Get or create creator's Stripe account
    const creatorAccount = product.creator.creatorAccount;
    if (!creatorAccount || !creatorAccount.stripeAccountId) {
      return NextResponse.json(
        { error: 'Creator account not configured' },
        { status: 400 }
      );
    }
    if (creatorAccount.onboardingStatus !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Creator onboarding not complete' },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_intent_data: {
        application_fee_amount: Math.round(price.amount * 100 * (creatorAccount.platformFeePercent / 100)),
        transfer_data: {
          destination: creatorAccount.stripeAccountId,
        },
        metadata: {
          productId: product.id,
          userId: user.id,
        },
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.title,
              description: product.description?.substring(0, 500),
              images: product.creator.avatar
                ? [product.creator.avatar]
                : undefined,
              metadata: {
                productId: product.id,
              },
            },
            unit_amount: Math.round(price.amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/library?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/p/${product.slug}?canceled=true`,
      metadata: {
        productId: product.id,
        userId: user.id,
        productSlug: product.slug,
      },
      client_reference_id: `${user.id}_${Date.now()}`,
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Create checkout session record
    await db.checkoutSession.create({
      data: {
        sessionId: session.id,
        userId: user.id,
        productId: product.id,
        priceId: price.id,
        amount: price.amount,
        currency: 'USD',
        status: 'PENDING',
        successUrl: sessionParams.success_url,
        cancelUrl: sessionParams.cancelUrl,
        metadata: JSON.stringify(sessionParams.metadata),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    return NextResponse.json(
      {
        checkoutUrl: session.url,
        sessionId: session.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    if (error instanceof StripeConfigError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
