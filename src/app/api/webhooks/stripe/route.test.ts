import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
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
    static webhooks = {
      constructEvent: mocks.stripeConstructEvent,
    };

    webhooks = {
      constructEvent: mocks.stripeConstructEvent,
    };

    events = {
      retrieve: mocks.stripeRetrieveEvent,
    };
  },
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

function createRequest(body = '{}', signature: string | null = 'sig_test_123') {
  const headers = new Headers();
  if (signature) {
    headers.set('stripe-signature', signature);
  }

  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers,
    body,
  });
}

describe('POST /api/webhooks/stripe', () => {
  const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
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

  afterAll(() => {
    if (originalWebhookSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      return;
    }

    process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
  });

  it('returns 400 when signature header is missing', async () => {
    const response = await POST(createRequest('{}', null) as any);
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
