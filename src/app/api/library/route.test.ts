import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    getCurrentUser: vi.fn(),
    db: {
      entitlement: {
        findMany: vi.fn(),
      },
    },
  };
});

vi.mock('@/lib/supabase/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('@/lib/db', () => ({
  db: mocks.db,
}));

import { GET } from './route';

function createRequest() {
  return new Request('http://localhost/api/library', {
    method: 'GET',
  });
}

describe('GET /api/library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1' });
    mocks.db.entitlement.findMany.mockResolvedValue([
      {
        id: 'ent-1',
        userId: 'user-1',
        productId: 'product-1',
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
        product: {
          id: 'product-1',
          slug: 'my-sequence',
          title: 'My Sequence',
          category: 'CHRISTMAS',
          description: 'A test sequence',
          includesFSEQ: true,
          includesSource: false,
        },
        version: {
          id: 'ver-2',
          versionNumber: 2,
          versionName: '2.0.0',
          publishedAt: new Date('2026-01-02T10:00:00.000Z'),
        },
        order: {
          orderNumber: 'ORD-1001',
          totalAmount: 50,
          items: [
            { productId: 'product-1', priceAtPurchase: 29.99 },
            { productId: 'product-2', priceAtPurchase: 20.01 },
          ],
        },
      },
    ]);
  });

  it('returns 401 for unauthenticated users', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await GET(createRequest() as any);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Unauthorized');
  });

  it('returns purchases using purchased version and matching order item price', async () => {
    const response = await GET(createRequest() as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.purchases).toHaveLength(1);
    expect(payload.purchases[0]).toEqual({
      id: 'ent-1',
      orderNumber: 'ORD-1001',
      product: {
        id: 'product-1',
        slug: 'my-sequence',
        title: 'My Sequence',
        category: 'CHRISTMAS',
        description: 'A test sequence',
        includesFSEQ: true,
        includesSource: false,
      },
      version: {
        id: 'ver-2',
        versionNumber: 2,
        versionName: '2.0.0',
        publishedAt: '2026-01-02T10:00:00.000Z',
      },
      price: 29.99,
      purchasedAt: '2026-01-01T10:00:00.000Z',
    });
  });
});
