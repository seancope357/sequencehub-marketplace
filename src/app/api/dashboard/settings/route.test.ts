import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  applyRateLimit: vi.fn(),
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userSettings: {
      upsert: vi.fn(),
    },
    profile: {
      upsert: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/auth/guards', () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
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

import { GET, PUT } from './route';

describe('/api/dashboard/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1', email: 'seller@example.com' },
    });
    mocks.applyRateLimit.mockResolvedValue({ allowed: true });

    mocks.db.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'seller@example.com',
      name: 'Seller',
      profile: { displayName: 'Seller' },
    });
    mocks.db.userSettings.upsert.mockResolvedValue({
      businessName: null,
      supportEmail: null,
      notificationEmail: 'seller@example.com',
      timezone: 'UTC',
      currency: 'USD',
      dashboardDefaultView: 'overview',
      productsPageSize: 25,
      themePreference: 'system',
      notifyNewOrder: true,
      notifyPayouts: true,
      notifyComments: false,
      notifySystem: true,
      marketingOptIn: false,
    });
  });

  it('returns settings payload for authenticated user', async () => {
    const response = await GET(new Request('http://localhost/api/dashboard/settings') as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.settings.displayName).toBe('Seller');
    expect(payload.settings.currency).toBe('USD');
    expect(payload.accountEmail).toBe('seller@example.com');
    expect(payload.options.pageSizes).toContain(25);
  });

  it('returns 400 for invalid settings payload', async () => {
    const response = await PUT(
      new Request('http://localhost/api/dashboard/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          displayName: 'x',
          timezone: 'UTC',
        }),
      }) as any
    );

    expect(response.status).toBe(400);
  });

  it('updates settings and returns saved payload', async () => {
    mocks.db.$transaction.mockImplementationOnce(async (callback: any) => {
      const tx = {
        user: {
          update: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'seller@example.com',
            name: 'Seller Updated',
          }),
        },
        profile: {
          upsert: vi.fn().mockResolvedValue({
            displayName: 'Seller Updated',
          }),
        },
        userSettings: {
          upsert: vi.fn().mockResolvedValue({
            businessName: 'Holiday Co',
            supportEmail: 'support@example.com',
            notificationEmail: 'notify@example.com',
            timezone: 'America/Los_Angeles',
            currency: 'USD',
            dashboardDefaultView: 'listings',
            productsPageSize: 50,
            themePreference: 'dark',
            notifyNewOrder: true,
            notifyPayouts: true,
            notifyComments: true,
            notifySystem: true,
            marketingOptIn: true,
          }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue(undefined),
        },
      };

      return callback(tx);
    });

    const response = await PUT(
      new Request('http://localhost/api/dashboard/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Seller Updated',
          businessName: 'Holiday Co',
          supportEmail: 'support@example.com',
          notificationEmail: 'notify@example.com',
          timezone: 'America/Los_Angeles',
          currency: 'USD',
          dashboardDefaultView: 'listings',
          productsPageSize: 50,
          themePreference: 'dark',
          notifyNewOrder: true,
          notifyPayouts: true,
          notifyComments: true,
          notifySystem: true,
          marketingOptIn: true,
        }),
      }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.settings.displayName).toBe('Seller Updated');
    expect(payload.settings.productsPageSize).toBe(50);
    expect(payload.message).toContain('saved');
  });
});
