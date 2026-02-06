import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    getCurrentUser: vi.fn(),
    isAdmin: vi.fn(),
    db: {
      user: {
        findUnique: vi.fn(),
      },
      userRole: {
        upsert: vi.fn(),
        delete: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    },
  };
});

vi.mock('@/lib/supabase/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('@/lib/auth-utils', () => ({
  isAdmin: mocks.isAdmin,
}));

vi.mock('@/lib/db', () => ({
  db: mocks.db,
}));

import { DELETE, POST } from './route';

function createRequest(method: 'POST' | 'DELETE', body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/users/user-2/roles', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/admin/users/[userId]/roles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      roles: [{ role: 'ADMIN' }],
    });
    mocks.isAdmin.mockReturnValue(true);
    mocks.db.user.findUnique.mockResolvedValue({ id: 'user-2' });
    mocks.db.userRole.upsert.mockResolvedValue({});
    mocks.db.userRole.delete.mockResolvedValue({});
    mocks.db.auditLog.create.mockResolvedValue({});
  });

  it('returns 403 for non-admin users', async () => {
    mocks.isAdmin.mockReturnValueOnce(false);

    const response = await POST(createRequest('POST', { role: 'CREATOR' }) as any, {
      params: { userId: 'user-2' },
    });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe('Forbidden');
  });

  it('rejects BUYER role addition', async () => {
    const response = await POST(createRequest('POST', { role: 'BUYER' }) as any, {
      params: { userId: 'user-2' },
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain('BUYER role is implicit');
  });

  it('adds creator role', async () => {
    const response = await POST(createRequest('POST', { role: 'CREATOR' }) as any, {
      params: { userId: 'user-2' },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mocks.db.userRole.upsert).toHaveBeenCalledWith({
      where: { userId_role: { userId: 'user-2', role: 'CREATOR' } },
      update: {},
      create: { userId: 'user-2', role: 'CREATOR' },
    });
  });

  it('prevents admin from removing own admin role', async () => {
    const response = await DELETE(createRequest('DELETE', { role: 'ADMIN' }) as any, {
      params: { userId: 'admin-1' },
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain('cannot remove your own admin role');
    expect(mocks.db.userRole.delete).not.toHaveBeenCalled();
  });
});
