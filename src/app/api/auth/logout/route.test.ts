import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    createAuditLog: vi.fn(),
    createRouteHandlerClient: vi.fn(),
    applyCookieChanges: vi.fn(),
    getUser: vi.fn(),
    signOut: vi.fn(),
  };
});

vi.mock('@/lib/supabase/auth', () => ({
  createAuditLog: mocks.createAuditLog,
}));

vi.mock('@/lib/supabase/route-handler', () => ({
  createRouteHandlerClient: mocks.createRouteHandlerClient,
  applyCookieChanges: mocks.applyCookieChanges,
}));

import { POST } from './route';

function createRequest() {
  return new Request('http://localhost/api/auth/logout', {
    method: 'POST',
  });
}

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.createRouteHandlerClient.mockReturnValue({
      supabase: {
        auth: {
          getUser: mocks.getUser,
          signOut: mocks.signOut,
        },
      },
      cookieChanges: [{ name: 'sb-access-token', value: '', options: {} }],
    });
  });

  it('returns 500 when sign out fails', async () => {
    mocks.signOut.mockResolvedValueOnce({
      error: { message: 'Unable to sign out' },
    });

    const response = await POST(createRequest() as any);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe('Unable to sign out');
  });

  it('logs logout and returns success', async () => {
    const response = await POST(createRequest() as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.message).toBe('Logged out successfully');
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        action: 'USER_LOGOUT',
      })
    );
    expect(mocks.applyCookieChanges).toHaveBeenCalledTimes(1);
  });

  it('does not log logout when there is no user in session', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } });

    const response = await POST(createRequest() as any);

    expect(response.status).toBe(200);
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });
});
