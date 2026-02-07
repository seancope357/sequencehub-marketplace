import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    getCurrentUser: vi.fn(),
    applyRateLimit: vi.fn(),
    getStripeConfigStatus: vi.fn(),
    stripeCreateSession: vi.fn(),
    db: {
      product: {
        findUnique: vi.fn(),
      },
      checkoutSession: {
        create: vi.fn(),
      },
    },
  };
});

vi.mock('stripe', () => {
  return {
    default: class StripeMock {
      checkout = {
        sessions: {
          create: mocks.stripeCreateSession,
        },
      };
    },
  };
});

vi.mock('@/lib/supabase/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('@/lib/rate-limit', () => ({
  applyRateLimit: mocks.applyRateLimit,
  RATE_LIMIT_CONFIGS: {
    CHECKOUT_CREATE: {},
  },
}));

vi.mock('@/lib/stripe-connect', async () => {
  const actual = await vi.importActual<typeof import('@/lib/stripe-connect')>('@/lib/stripe-connect');
  return {
    ...actual,
    getStripeConfigStatus: mocks.getStripeConfigStatus,
  };
});

vi.mock('@/lib/db', () => ({
  db: mocks.db,
}));

import { POST } from './route';

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/checkout/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/checkout/create', () => {
  const originalStripeSecret = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    mocks.getCurrentUser.mockResolvedValue({
      id: 'buyer-1',
      email: 'buyer@example.com',
    });
    mocks.applyRateLimit.mockResolvedValue({ allowed: true });
    mocks.getStripeConfigStatus.mockReturnValue({ configured: true });
    mocks.db.product.findUnique.mockResolvedValue({
      id: 'product-1',
      slug: 'tree-sequence',
      title: 'Tree Sequence',
      description: 'Holiday sequence',
      status: 'PUBLISHED',
      creator: {
        avatar: null,
        creatorAccount: {
          stripeAccountId: 'acct_123',
          onboardingStatus: 'COMPLETED',
          platformFeePercent: 10,
        },
      },
      prices: [
        {
          id: 'price-1',
          amount: 20,
        },
      ],
    });
    mocks.stripeCreateSession.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/pay/cs_test_123',
    });
    mocks.db.checkoutSession.create.mockResolvedValue({ id: 'checkout-1' });
  });

  afterAll(() => {
    if (originalStripeSecret === undefined) {
      delete process.env.STRIPE_SECRET_KEY;
      return;
    }

    process.env.STRIPE_SECRET_KEY = originalStripeSecret;
  });

  it('returns 409 when Stripe is not configured', async () => {
    mocks.getStripeConfigStatus.mockReturnValueOnce({
      configured: false,
      message: 'Stripe Connect unavailable',
    });

    const response = await POST(createRequest({ productId: 'product-1' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toBe('Stripe Connect unavailable');
  });

  it('returns 401 when user is unauthenticated', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(createRequest({ productId: 'product-1' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Unauthorized');
  });

  it('blocks checkout when creator onboarding is incomplete', async () => {
    mocks.db.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      slug: 'tree-sequence',
      title: 'Tree Sequence',
      description: 'Holiday sequence',
      status: 'PUBLISHED',
      creator: {
        avatar: null,
        creatorAccount: {
          stripeAccountId: 'acct_123',
          onboardingStatus: 'IN_PROGRESS',
          platformFeePercent: 10,
        },
      },
      prices: [{ id: 'price-1', amount: 20 }],
    });

    const response = await POST(createRequest({ productId: 'product-1' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Creator onboarding not complete');
    expect(mocks.stripeCreateSession).not.toHaveBeenCalled();
  });

  it('creates checkout session when creator is fully onboarded', async () => {
    const response = await POST(createRequest({ productId: 'product-1' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_123');
    expect(payload.sessionId).toBe('cs_test_123');
    expect(mocks.stripeCreateSession).toHaveBeenCalledTimes(1);
    expect(mocks.db.checkoutSession.create).toHaveBeenCalledTimes(1);
  });
});
