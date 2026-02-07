import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireCreatorOrAdminUser: vi.fn(),
  applyRateLimit: vi.fn(),
  db: {
    supportTicket: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
    orderItem: {
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
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
    PRODUCT_UPDATE: {},
  },
}));

vi.mock('@/lib/db', () => ({
  db: mocks.db,
}));

import { GET, POST } from './route';

describe('/api/dashboard/support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCreatorOrAdminUser.mockResolvedValue({ user: { id: 'creator-1' } });
    mocks.applyRateLimit.mockResolvedValue({ allowed: true });
  });

  it('returns support tickets for current seller', async () => {
    mocks.db.supportTicket.count.mockResolvedValueOnce(1);
    mocks.db.supportTicket.findMany.mockResolvedValueOnce([
      {
        id: 'ticket-1',
        sellerId: 'creator-1',
        category: 'general',
        subject: 'Need help',
        description: 'Issue details',
        status: 'OPEN',
      },
    ]);

    const response = await GET(new Request('http://localhost/api/dashboard/support') as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.tickets).toHaveLength(1);
  });

  it('creates support ticket for valid payload', async () => {
    mocks.db.supportTicket.create.mockResolvedValueOnce({
      id: 'ticket-1',
      sellerId: 'creator-1',
      category: 'general',
      subject: 'Need help with payout',
      description: 'Detailed description text.',
      status: 'OPEN',
      orderId: null,
      productId: null,
      createdAt: new Date('2026-02-07T10:00:00.000Z'),
    });
    mocks.db.auditLog.create.mockResolvedValueOnce(undefined);

    const response = await POST(
      new Request('http://localhost/api/dashboard/support', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          category: 'general',
          subject: 'Need help with payout',
          description: 'Detailed description text.',
        }),
      }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.ticket.id).toBe('ticket-1');
  });
});
