import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    getCurrentUser: vi.fn(),
    createAuditLog: vi.fn(),
    isCreatorOrAdmin: vi.fn(),
    isAdmin: vi.fn(),
    applyRateLimit: vi.fn(),
    getStripeConfigStatus: vi.fn(),
    db: {
      creatorAccount: {
        findUnique: vi.fn(),
      },
      product: {
        create: vi.fn(),
      },
    },
  };
});

vi.mock('@/lib/supabase/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
  createAuditLog: mocks.createAuditLog,
}));

vi.mock('@/lib/auth-utils', () => ({
  isCreatorOrAdmin: mocks.isCreatorOrAdmin,
  isAdmin: mocks.isAdmin,
}));

vi.mock('@/lib/rate-limit', () => ({
  applyRateLimit: mocks.applyRateLimit,
  RATE_LIMIT_CONFIGS: {
    PRODUCT_CREATE: {},
  },
}));

vi.mock('@/lib/stripe-connect', () => ({
  getStripeConfigStatus: mocks.getStripeConfigStatus,
}));

vi.mock('@/lib/db', () => ({
  db: mocks.db,
}));

import { POST } from './route';

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/dashboard/products', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const baseBody = {
  title: 'Test Product',
  description: 'Description',
  category: 'CHRISTMAS',
  price: 10,
  includesFSEQ: true,
  includesSource: false,
};

describe('POST /api/dashboard/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: 'user-1',
      email: 'creator@example.com',
      roles: [{ role: 'CREATOR' }],
    });
    mocks.isCreatorOrAdmin.mockReturnValue(true);
    mocks.isAdmin.mockReturnValue(false);
    mocks.applyRateLimit.mockResolvedValue({ allowed: true });
    mocks.getStripeConfigStatus.mockReturnValue({ configured: true });
    mocks.db.creatorAccount.findUnique.mockResolvedValue({
      stripeAccountId: 'acct_123',
      onboardingStatus: 'COMPLETED',
    });
    mocks.db.product.create.mockResolvedValue({
      id: 'product-1',
      slug: 'test-product',
    });
  });

  it('returns 401 when user is not authenticated', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(createRequest(baseBody) as any);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error.message).toBe('Unauthorized');
  });

  it('blocks publish when Stripe is not configured', async () => {
    mocks.getStripeConfigStatus.mockReturnValueOnce({
      configured: false,
      message: 'Stripe is missing',
    });

    const response = await POST(
      createRequest({ ...baseBody, status: 'PUBLISHED' }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.message).toBe('Stripe is missing');
    expect(mocks.db.product.create).not.toHaveBeenCalled();
  });

  it('blocks publish when onboarding is incomplete', async () => {
    mocks.db.creatorAccount.findUnique.mockResolvedValueOnce({
      stripeAccountId: 'acct_123',
      onboardingStatus: 'IN_PROGRESS',
    });

    const response = await POST(
      createRequest({ ...baseBody, status: 'PUBLISHED' }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.message).toContain('Stripe Connect onboarding is required');
    expect(mocks.db.product.create).not.toHaveBeenCalled();
  });

  it('allows saving drafts without Stripe checks', async () => {
    const response = await POST(
      createRequest({ ...baseBody, status: 'DRAFT' }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.product).toEqual({
      id: 'product-1',
      slug: 'test-product',
    });
    expect(mocks.db.creatorAccount.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.product.create).toHaveBeenCalledTimes(1);
  });
});
