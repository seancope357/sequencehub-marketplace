import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    headers: vi.fn(),
    stripeConstructEvent: vi.fn(),
    stripeRetrieveEvent: vi.fn(),
    createAuditLog: vi.fn(),
    db: {
      checkoutSession: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      product: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      order: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      orderItem: {
        create: vi.fn(),
      },
      entitlement: {
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      creatorAccount: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

vi.mock('stripe', () => ({
  default: class StripeMock {
    webhooks = {
      constructEvent: mocks.stripeConstructEvent,
    };

    events = {
      retrieve: mocks.stripeRetrieveEvent,
    };
  },
}));

vi.mock('next/headers', () => ({
  headers: mocks.headers,
}));

vi.mock('@/lib/supabase/auth', () => ({
  createAuditLog: mocks.createAuditLog,
}));

vi.mock('@/lib/db', () => ({
  db: mocks.db,
}));

vi.mock('@/lib/email/send', () => ({
  sendPurchaseConfirmation: vi.fn(),
  sendSaleNotification: vi.fn(),
}));

vi.mock('@/lib/stripe-connect', () => ({
  updateCreatorAccountStatus: vi.fn(),
}));

import { POST } from './route';

function createRequest(body = '{}') {
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    body,
  });
}

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockReturnValue({
      get: (key: string) => {
        if (key === 'stripe-signature') {
          return 'sig_test_123';
        }

        return null;
      },
    });
    mocks.stripeConstructEvent.mockReturnValue({
      id: 'evt_123',
      type: 'sequencehub.unhandled',
      created: 1700000000,
      data: {
        object: { id: 'obj_1' },
      },
    });
    mocks.stripeRetrieveEvent.mockResolvedValue(undefined);
    mocks.createAuditLog.mockResolvedValue(undefined);
  });

  it('returns 400 when signature header is missing', async () => {
    mocks.headers.mockReturnValueOnce({ get: () => null });

    const response = await POST(createRequest() as any);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('No signature provided');
  });

  it('returns 400 when signature verification fails', async () => {
    mocks.stripeConstructEvent.mockImplementationOnce(() => {
      throw new Error('invalid signature');
    });

    const response = await POST(createRequest() as any);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Invalid signature');
  });

  it('returns 200 and logs webhook for unhandled event types', async () => {
    const response = await POST(createRequest() as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.received).toBe(true);
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(2);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STRIPE_WEBHOOK_RECEIVED',
        entityType: 'webhook',
        entityId: 'evt_123',
      })
    );
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STRIPE_WEBHOOK_PROCESSED',
        entityType: 'webhook',
        entityId: 'evt_123',
      })
    );
  });
});
