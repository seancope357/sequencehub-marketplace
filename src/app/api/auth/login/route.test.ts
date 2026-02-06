import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    createAuditLog: vi.fn(),
    ensureUserRecord: vi.fn(),
    createRouteHandlerClient: vi.fn(),
    applyCookieChanges: vi.fn(),
    applyRateLimit: vi.fn(),
    signInWithPassword: vi.fn(),
  };
});

vi.mock('@/lib/supabase/auth', () => ({
  createAuditLog: mocks.createAuditLog,
  ensureUserRecord: mocks.ensureUserRecord,
}));

vi.mock('@/lib/supabase/route-handler', () => ({
  createRouteHandlerClient: mocks.createRouteHandlerClient,
  applyCookieChanges: mocks.applyCookieChanges,
}));

vi.mock('@/lib/rate-limit', () => ({
  applyRateLimit: mocks.applyRateLimit,
  RATE_LIMIT_CONFIGS: {
    AUTH_LOGIN: {},
  },
}));

import { POST } from './route';

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applyRateLimit.mockResolvedValue({ allowed: true });
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null,
    });
    mocks.createRouteHandlerClient.mockReturnValue({
      supabase: {
        auth: {
          signInWithPassword: mocks.signInWithPassword,
        },
      },
      cookieChanges: [{ name: 'sb-access-token', value: 'token', options: {} }],
    });
    mocks.ensureUserRecord.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      roles: [{ role: 'BUYER' }],
    });
    mocks.createAuditLog.mockResolvedValue(undefined);
  });

  it('returns rate-limit response when blocked', async () => {
    mocks.applyRateLimit.mockResolvedValueOnce({
      allowed: false,
      response: new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'content-type': 'application/json' },
      }),
    });

    const response = await POST(createRequest({ email: 'a@b.com', password: 'password123' }) as any);

    expect(response.status).toBe(429);
  });

  it('returns 400 for missing credentials', async () => {
    const response = await POST(createRequest({ email: 'a@b.com' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Email and password are required');
  });

  it('returns 401 when Supabase login fails', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    const response = await POST(createRequest({ email: 'a@b.com', password: 'password123' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Invalid login credentials');
  });

  it('returns 500 when user profile cannot be ensured', async () => {
    mocks.ensureUserRecord.mockResolvedValueOnce(null);

    const response = await POST(createRequest({ email: 'a@b.com', password: 'password123' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe('Failed to load user profile');
  });

  it('returns authenticated user payload on success', async () => {
    const response = await POST(createRequest({ email: 'a@b.com', password: 'password123' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.user).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      roles: [{ role: 'BUYER' }],
    });
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        action: 'USER_LOGIN',
      })
    );
    expect(mocks.applyCookieChanges).toHaveBeenCalledTimes(1);
  });
});
