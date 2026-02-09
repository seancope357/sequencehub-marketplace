import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createAuditLog } from '@/lib/auth';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Apply rate limiting
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
    const { productId, successUrl, cancelUrl } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Fetch product with creator info and active price
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        creator: {
          include: {
            creatorAccount: true,
          },
        },
        prices: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        media: {
          where: { mediaType: 'cover' },
          take: 1,
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

    // Check if user already owns this product
    const existingEntitlement = await db.entitlement.findFirst({
      where: {
        userId: user.id,
        productId: productId,
        isActive: true,
      },
    });

    if (existingEntitlement) {
      return NextResponse.json(
        { error: 'You already own this product' },
        { status: 400 }
      );
    }

    const activePrice = product.prices[0];
    if (!activePrice) {
      return NextResponse.json(
        { error: 'No active price found for this product' },
        { status: 400 }
      );
    }

    // Check creator has Stripe Connect account
    const creatorAccount = product.creator.creatorAccount;
    if (!creatorAccount || !creatorAccount.stripeAccountId) {
      return NextResponse.json(
        { error: 'Creator has not connected their Stripe account' },
        { status: 400 }
      );
    }

    if (creatorAccount.onboardingStatus !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Creator has not completed Stripe onboarding' },
        { status: 400 }
      );
    }

    // Calculate platform fee (default 10%)
    const platformFeePercent = creatorAccount.platformFeePercent || 10.0;
    const amountInCents = Math.round(activePrice.amount * 100);
    const platformFeeAmount = Math.round(amountInCents * (platformFeePercent / 100));

    // Get cover image URL for Stripe checkout
    const coverImage = product.media[0];
    const images = coverImage?.storageKey
      ? [`${BASE_URL}/api/media/${coverImage.storageKey}`]
      : [];

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: activePrice.currency.toLowerCase(),
            unit_amount: amountInCents,
            product_data: {
              name: product.title,
              description: product.description.substring(0, 500), // Stripe limit
              images: images,
              metadata: {
                productId: product.id,
                category: product.category,
              },
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: creatorAccount.stripeAccountId,
        },
        metadata: {
          userId: user.id,
          productId: product.id,
          creatorId: product.creatorId,
          priceId: activePrice.id,
        },
      },
      success_url: successUrl || `${BASE_URL}/library?purchase=success`,
      cancel_url: cancelUrl || `${BASE_URL}/browse/products/${product.slug}`,
      metadata: {
        userId: user.id,
        productId: product.id,
        creatorId: product.creatorId,
        priceId: activePrice.id,
        platformFeePercent: platformFeePercent.toString(),
      },
    });

    // Create CheckoutSession record
    await db.checkoutSession.create({
      data: {
        sessionId: session.id,
        userId: user.id,
        productId: product.id,
        priceId: activePrice.id,
        amount: activePrice.amount,
        currency: activePrice.currency,
        status: 'PENDING',
        successUrl: successUrl || null,
        cancelUrl: cancelUrl || null,
        metadata: JSON.stringify({
          creatorId: product.creatorId,
          platformFeePercent,
          platformFeeAmount: platformFeeAmount / 100, // Store in dollars
        }),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'CHECKOUT_SESSION_CREATED',
      entityType: 'checkout_session',
      entityId: session.id,
      changes: JSON.stringify({
        productId: product.id,
        amount: activePrice.amount,
        currency: activePrice.currency,
      }),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      {
        sessionId: session.id,
        url: session.url,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
