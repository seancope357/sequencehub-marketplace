import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    getCurrentUser: vi.fn(),
    isAdmin: vi.fn(),
    db: {
      product: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
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

function createRequest(status: string) {
  return new Request('http://localhost/api/admin/products/prod-1/status', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

describe('PATCH /api/admin/products/[productId]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      roles: [{ role: 'ADMIN' }],
    });
    mocks.isAdmin.mockReturnValue(true);
    mocks.db.product.findUnique.mockResolvedValue({
      id: 'prod-1',
      status: 'DRAFT',
    });
    mocks.db.product.update.mockResolvedValue({
      id: 'prod-1',
      status: 'PUBLISHED',
    });
    mocks.db.auditLog.create.mockResolvedValue({});
  });

  it('returns 400 for invalid status', async () => {
    const response = await PATCH(createRequest('INVALID') as any, {
      params: { productId: 'prod-1' },
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Invalid status');
  });

  it('updates product status and logs admin action', async () => {
    const response = await PATCH(createRequest('PUBLISHED') as any, {
      params: { productId: 'prod-1' },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true, status: 'PUBLISHED' });
    expect(mocks.db.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { status: 'PUBLISHED' },
    });
    expect(mocks.db.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
