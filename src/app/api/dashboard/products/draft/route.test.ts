import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createAuditLog: vi.fn(),
  isCreatorOrAdmin: vi.fn(),
  applyRateLimit: vi.fn(),
  db: {
    product: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    price: {
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
  createAuditLog: mocks.createAuditLog,
}));

vi.mock('@/lib/auth-utils', () => ({
  isCreatorOrAdmin: mocks.isCreatorOrAdmin,
}));

vi.mock('@/lib/rate-limit', () => ({
  applyRateLimit: mocks.applyRateLimit,
  RATE_LIMIT_CONFIGS: {
    PRODUCT_UPDATE: {},
  },
}));

vi.mock('@/lib/db', () => ({
  db: mocks.db,
}));

import { POST } from './route';

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/dashboard/products/draft', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/dashboard/products/draft', () => {
  const draftId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getCurrentUser.mockResolvedValue({
      id: 'creator-1',
      roles: [{ role: 'CREATOR' }],
    });

    mocks.isCreatorOrAdmin.mockReturnValue(true);
    mocks.applyRateLimit.mockResolvedValue({ allowed: true });
    mocks.db.product.findUnique.mockResolvedValue(null);
    mocks.db.product.create.mockResolvedValue({
      id: draftId,
      slug: 'my-draft',
    });
    mocks.db.$transaction.mockImplementation(async (callback: any) =>
      callback({
        product: {
          update: vi.fn().mockResolvedValue({ id: draftId, slug: 'updated-draft' }),
        },
        price: {
          updateMany: vi.fn().mockResolvedValue(undefined),
          create: vi.fn().mockResolvedValue(undefined),
        },
      })
    );
  });

  it('returns 401 when unauthenticated', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(createRequest({ title: 'Draft' }) as any);
    expect(response.status).toBe(401);
  });

  it('creates a new draft and returns draft id', async () => {
    const response = await POST(
      createRequest({
        title: 'My Draft',
        description: 'Description',
        category: 'CHRISTMAS',
        price: 10,
      }) as any
    );

    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.draftId).toBe(draftId);
    expect(mocks.db.product.create).toHaveBeenCalledTimes(1);
  });

  it('updates existing draft when draftId is provided', async () => {
    mocks.db.product.findUnique.mockResolvedValueOnce({
      id: draftId,
      creatorId: 'creator-1',
      slug: 'existing-draft',
      status: 'DRAFT',
    });

    const response = await POST(
      createRequest({
        draftId,
        title: 'Updated Draft',
        price: 30,
      }) as any
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.draftId).toBe(draftId);
    expect(mocks.db.$transaction).toHaveBeenCalledTimes(1);
  });
});
