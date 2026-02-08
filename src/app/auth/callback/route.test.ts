import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createRouteHandlerClient: vi.fn(),
  applyCookieChanges: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}));

vi.mock('@/lib/supabase/route-handler', () => ({
  createRouteHandlerClient: mocks.createRouteHandlerClient,
  applyCookieChanges: mocks.applyCookieChanges,
}));

import { GET } from './route';

function createRequest(url: string) {
  return new Request(url, { method: 'GET' });
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.createRouteHandlerClient.mockReturnValue({
      supabase: {
        auth: {
          exchangeCodeForSession: mocks.exchangeCodeForSession,
        },
      },
      cookieChanges: [{ name: 'sb-access-token', value: 'token', options: {} }],
    });
  });

  it('redirects to login when auth provider returns an error', async () => {
    const response = await GET(
      createRequest('http://localhost/auth/callback?error=access_denied&error_description=Denied') as any
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/auth/login');
    expect(response.headers.get('location')).toContain('Denied');
  });

  it('redirects to login when verification code is missing', async () => {
    const response = await GET(createRequest('http://localhost/auth/callback') as any);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/auth/login');
    expect(response.headers.get('location')).toContain('Missing+verification+code');
  });

  it('redirects to login when code exchange fails', async () => {
    mocks.exchangeCodeForSession.mockResolvedValueOnce({
      error: { message: 'code expired' },
    });

    const response = await GET(createRequest('http://localhost/auth/callback?code=abc123') as any);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/auth/login');
    expect(response.headers.get('location')).toContain('expired+or+invalid');
  });

  it('redirects to dashboard and applies cookie updates on success', async () => {
    const response = await GET(createRequest('http://localhost/auth/callback?code=abc123') as any);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/dashboard');
    expect(mocks.applyCookieChanges).toHaveBeenCalledTimes(1);
  });
});
