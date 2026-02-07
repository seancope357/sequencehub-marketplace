import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireCreatorOrAdminUser: vi.fn(),
  applyRateLimit: vi.fn(),
  getStripeConfigStatus: vi.fn(),
  getAccountStatus: vi.fn(),
  db: {
    creatorAccount: {
      findUnique: vi.fn(),
    },
    orderItem: {
      aggregate: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/guards', () => ({
  requireCreatorOrAdminUser: mocks.requireCreatorOrAdminUser,
}));

vi.mock('@/lib/rate-limit', () => ({
  applyRateLimit: mocks.applyRateLimit,
  RATE_LIMIT_CONFIGS: {
    STATS_QUERY: {},
  },
}));

vi.mock('@/lib/stripe-connect', () => ({
  getStripeConfigStatus: mocks.getStripeConfigStatus,
  getAccountStatus: mocks.getAccountStatus,
}));

vi.mock('@/lib/db', () => ({
  db: mocks.db,
}));

import { GET } from './route';

describe('GET /api/dashboard/payouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCreatorOrAdminUser.mockResolvedValue({ user: { id: 'creator-1' } });
    mocks.applyRateLimit.mockResolvedValue({ allowed: true });
    mocks.db.orderItem.aggregate.mockResolvedValue({ _sum: { priceAtPurchase: 50 }, _count: { id: 2 } });
  });

  it('returns configuration warning when stripe is not configured', async () => {
    mocks.getStripeConfigStatus.mockReturnValueOnce({ configured: false, message: 'Not configured' });
    mocks.db.creatorAccount.findUnique.mockResolvedValueOnce(null);

    const response = await GET(new Request('http://localhost/api/dashboard/payouts') as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.stripeConfigured).toBe(false);
    expect(payload.message).toBe('Not configured');
  });

  it('returns live payout readiness when stripe account exists', async () => {
    mocks.getStripeConfigStatus.mockReturnValueOnce({ configured: true });
    mocks.db.creatorAccount.findUnique.mockResolvedValueOnce({
      id: 'acct-row',
      stripeAccountId: 'acct_123',
      stripeAccountStatus: 'active',
      onboardingStatus: 'COMPLETED',
      totalRevenue: 50,
      totalSales: 2,
      payoutSchedule: 'manual',
      updatedAt: new Date('2026-02-07T10:00:00.000Z'),
    });
    mocks.getAccountStatus.mockResolvedValueOnce({
      account: {},
      isComplete: true,
      chargesEnabled: true,
      detailsSubmitted: true,
      capabilitiesActive: true,
    });

    const response = await GET(new Request('http://localhost/api/dashboard/payouts') as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.hasAccount).toBe(true);
    expect(payload.canReceivePayments).toBe(true);
    expect(payload.revenue.grossSales).toBe(50);
  });
});
