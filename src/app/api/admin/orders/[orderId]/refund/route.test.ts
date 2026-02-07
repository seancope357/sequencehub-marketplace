import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    stripeCreateRefund: vi.fn(),
    getCurrentUser: vi.fn(),
    isAdmin: vi.fn(),
    getStripeConfigStatus: vi.fn(),
    db: {
      order: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      entitlement: {
        updateMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    },
  };
});

vi.mock('stripe', () => {
  return {
    default: class StripeMock {
      refunds = {
        create: mocks.stripeCreateRefund,
      };
    },
  };
});

vi.mock('@/lib/supabase/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('@/lib/auth-utils', () => ({
  isAdmin: mocks.isAdmin,
}));

vi.mock('@/lib/stripe-connect', () => ({
  getStripeConfigStatus: mocks.getStripeConfigStatus,
}));

vi.mock('@/lib/db', () => ({
  db: mocks.db,
}));

import { POST } from './route';

function createRequest() {
  return new Request('http://localhost/api/admin/orders/order-1/refund', {
    method: 'POST',
  });
}

describe('POST /api/admin/orders/[orderId]/refund', () => {
  const originalStripeSecret = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    mocks.getCurrentUser.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      roles: [{ role: 'ADMIN' }],
    });
    mocks.isAdmin.mockReturnValue(true);
    mocks.getStripeConfigStatus.mockReturnValue({ configured: true });
    mocks.db.order.findUnique.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-1',
      totalAmount: 25,
      status: 'COMPLETED',
      paymentIntentId: 'pi_123',
    });
    mocks.stripeCreateRefund.mockResolvedValue({
      id: 're_123',
      amount: 2500,
    });
    mocks.db.order.update.mockResolvedValue({});
    mocks.db.entitlement.updateMany.mockResolvedValue({ count: 1 });
    mocks.db.auditLog.create.mockResolvedValue({});
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
      message: 'Stripe unavailable',
    });

    const response = await POST(createRequest() as any, { params: { orderId: 'order-1' } });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toBe('Stripe unavailable');
  });

  it('returns 400 when payment intent is missing', async () => {
    mocks.db.order.findUnique.mockResolvedValueOnce({
      id: 'order-1',
      status: 'COMPLETED',
      paymentIntentId: null,
      totalAmount: 25,
    });

    const response = await POST(createRequest() as any, { params: { orderId: 'order-1' } });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain('does not have a payment intent');
    expect(mocks.stripeCreateRefund).not.toHaveBeenCalled();
  });

  it('processes full refunds and deactivates entitlements', async () => {
    const response = await POST(createRequest() as any, { params: { orderId: 'order-1' } });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      refundId: 're_123',
      amount: 25,
      fullRefund: true,
    });
    expect(mocks.db.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: {
        status: 'REFUNDED',
        refundedAmount: { increment: 25 },
        refundedAt: expect.any(Date),
      },
    });
    expect(mocks.db.entitlement.updateMany).toHaveBeenCalledWith({
      where: { orderId: 'order-1' },
      data: { isActive: false },
    });
    expect(mocks.db.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
