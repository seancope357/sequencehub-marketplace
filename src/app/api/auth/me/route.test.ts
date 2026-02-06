import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    getCurrentUserFromRequest: vi.fn(),
  };
});

vi.mock('@/lib/supabase/auth', () => ({
  getCurrentUserFromRequest: mocks.getCurrentUserFromRequest,
}));

import { GET } from './route';

function createRequest() {
  return new Request('http://localhost/api/auth/me', {
    method: 'GET',
  });
}

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mocks.getCurrentUserFromRequest.mockResolvedValueOnce(null);

    const response = await GET(createRequest() as any);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Not authenticated');
  });

  it('returns user payload when authenticated', async () => {
    mocks.getCurrentUserFromRequest.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      roles: [{ role: 'BUYER' }],
      profile: { displayName: 'User Display' },
    });

    const response = await GET(createRequest() as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.user).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      roles: [{ role: 'BUYER' }],
      profile: { displayName: 'User Display' },
    });
  });

  it('returns 500 when auth lookup throws', async () => {
    mocks.getCurrentUserFromRequest.mockRejectedValueOnce(new Error('boom'));

    const response = await GET(createRequest() as any);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe('Internal server error');
  });
});
