import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    getCurrentUser: vi.fn(),
    isAdmin: vi.fn(),
    db: {
      productMedia: {
        count: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
      auditLog: {
        create: vi.fn(),
      },
    },
  };
});

vi.mock('@/lib/supabase/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('@/lib/auth-utils', () => ({
  isAdmin: mocks.isAdmin,
}));

vi.mock('@/lib/db', () => ({
  db: mocks.db,
}));

import { PATCH } from './route';

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/products/product-1/media/order', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/admin/products/[id]/media/order', () => {
  const orderPayload = [
    { id: 'media-1', displayOrder: 0 },
    { id: 'media-2', displayOrder: 1 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: 'admin-1',
      roles: [{ role: 'ADMIN' }],
    });
    mocks.isAdmin.mockReturnValue(true);
    mocks.db.productMedia.count.mockResolvedValue(2);
    mocks.db.productMedia.update.mockResolvedValue(undefined);
    mocks.db.$transaction.mockResolvedValue(undefined);
    mocks.db.auditLog.create.mockResolvedValue(undefined);
  });

  it('returns 401 when user is unauthenticated', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await PATCH(createRequest({ order: orderPayload }) as any, {
      params: { id: 'product-1' },
    });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Unauthorized');
  });

  it('returns 403 when user is not admin', async () => {
    mocks.isAdmin.mockReturnValueOnce(false);

    const response = await PATCH(createRequest({ order: orderPayload }) as any, {
      params: { id: 'product-1' },
    });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe('Forbidden');
  });

  it('returns 400 when payload is missing', async () => {
    const response = await PATCH(createRequest({}) as any, {
      params: { id: 'product-1' },
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Missing order payload');
  });

  it('returns 400 when media set does not belong to product', async () => {
    mocks.db.productMedia.count.mockResolvedValueOnce(1);

    const response = await PATCH(createRequest({ order: orderPayload }) as any, {
      params: { id: 'product-1' },
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain('do not belong to this product');
  });

  it('updates media order and logs admin action', async () => {
    const response = await PATCH(createRequest({ order: orderPayload }) as any, {
      params: { id: 'product-1' },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mocks.db.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.db.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
