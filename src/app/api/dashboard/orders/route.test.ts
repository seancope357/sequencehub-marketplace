import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireCreatorOrAdminUser: vi.fn(),
  applyRateLimit: vi.fn(),
  db: {
    orderItem: {
      count: vi.fn(),
      findMany: vi.fn(),
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

vi.mock('@/lib/db', () => ({
  db: mocks.db,
}));

import { GET } from './route';

describe('GET /api/dashboard/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCreatorOrAdminUser.mockResolvedValue({
      user: { id: 'creator-1' },
    });
    mocks.applyRateLimit.mockResolvedValue({ allowed: true });
    mocks.db.orderItem.count.mockResolvedValue(1);
    mocks.db.orderItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        createdAt: new Date('2026-02-07T10:00:00.000Z'),
        priceAtPurchase: 25,
        currency: 'USD',
        product: { id: 'product-1', title: 'My Listing', slug: 'my-listing' },
        order: {
          id: 'order-1',
          orderNumber: 'ORD-0001',
          status: 'COMPLETED',
          totalAmount: 25,
          currency: 'USD',
          createdAt: new Date('2026-02-07T10:00:00.000Z'),
          userId: 'buyer-1',
        },
      },
    ]);
  });

  it('returns unauthorized/forbidden responses from guard', async () => {
    const responseFromGuard = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    mocks.requireCreatorOrAdminUser.mockResolvedValueOnce({ response: responseFromGuard });

    const response = await GET(new Request('http://localhost/api/dashboard/orders') as any);

    expect(response.status).toBe(401);
  });

  it('returns paginated seller orders', async () => {
    const response = await GET(new Request('http://localhost/api/dashboard/orders?page=1&pageSize=25') as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.orders).toHaveLength(1);
    expect(payload.orders[0].order.orderNumber).toBe('ORD-0001');
    expect(payload.pagination.total).toBe(1);
  });
});
