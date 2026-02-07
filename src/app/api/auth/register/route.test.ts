import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    createAuditLog: vi.fn(),
    ensureUserRecord: vi.fn(),
    createRouteHandlerClient: vi.fn(),
    applyCookieChanges: vi.fn(),
    applyRateLimit: vi.fn(),
    sendWelcomeEmail: vi.fn(),
    signUp: vi.fn(),
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
    AUTH_REGISTER: {},
  },
}));

vi.mock('@/lib/email/send', () => ({
  sendWelcomeEmail: mocks.sendWelcomeEmail,
}));

import { POST } from './route';

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applyRateLimit.mockResolvedValue({ allowed: true });
    mocks.signUp.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'new@example.com' } },
      error: null,
    });
    mocks.createRouteHandlerClient.mockReturnValue({
      supabase: {
        auth: {
          signUp: mocks.signUp,
        },
      },
      cookieChanges: [{ name: 'sb-access-token', value: 'token', options: {} }],
    });
    mocks.ensureUserRecord.mockResolvedValue({
      id: 'user-1',
      email: 'new@example.com',
      name: 'New User',
      roles: [{ role: 'BUYER' }],
    });
    mocks.createAuditLog.mockResolvedValue(undefined);
    mocks.sendWelcomeEmail.mockResolvedValue(undefined);
  });

  it('returns rate-limit response when blocked', async () => {
    mocks.applyRateLimit.mockResolvedValueOnce({
      allowed: false,
      response: new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'content-type': 'application/json' },
      }),
    });

    const response = await POST(
      createRequest({ email: 'new@example.com', password: 'Password123', acceptedLegal: true }) as any
    );

    expect(response.status).toBe(429);
  });

  it('returns 400 for invalid email format', async () => {
    const response = await POST(
      createRequest({ email: 'invalid-email', password: 'Password123', acceptedLegal: true }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Invalid email format');
  });

  it('returns 400 for weak passwords', async () => {
    const response = await POST(
      createRequest({ email: 'new@example.com', password: 'short', acceptedLegal: true }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Password must be at least 8 characters long');
  });

  it('returns 400 when legal terms are not accepted', async () => {
    const response = await POST(
      createRequest({ email: 'new@example.com', password: 'Password123', acceptedLegal: false }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain('must accept');
  });

  it('returns 409 when Supabase rejects sign up', async () => {
    mocks.signUp.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'User already registered' },
    });

    const response = await POST(
      createRequest({ email: 'new@example.com', password: 'Password123', acceptedLegal: true }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toBe('An account with this email already exists. Please sign in.');
  });

  it('returns 500 when user profile cannot be ensured', async () => {
    mocks.ensureUserRecord.mockResolvedValueOnce(null);

    const response = await POST(
      createRequest({ email: 'new@example.com', password: 'Password123', acceptedLegal: true }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe('Failed to load user profile');
  });

  it('returns created user payload and triggers welcome email', async () => {
    const response = await POST(
      createRequest({ email: ' new@example.com ', password: 'Password123', name: 'New User', acceptedLegal: true }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.user).toEqual({
      id: 'user-1',
      email: 'new@example.com',
      name: 'New User',
      roles: [{ role: 'BUYER' }],
    });
    expect(mocks.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
      })
    );
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        action: 'USER_REGISTERED',
      })
    );
    expect(mocks.sendWelcomeEmail).toHaveBeenCalledTimes(1);
    expect(mocks.applyCookieChanges).toHaveBeenCalledTimes(1);
  });
});
