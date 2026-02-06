import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    getCurrentUser: vi.fn(),
    isAdmin: vi.fn(),
    deleteFile: vi.fn(),
    db: {
      productMedia: {
        findUnique: vi.fn(),
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

vi.mock('@/lib/storage', () => ({
  deleteFile: mocks.deleteFile,
}));

vi.mock('@/lib/db', () => ({
  db: mocks.db,
}));

import { DELETE } from './route';

function createRequest() {
  return new Request('http://localhost/api/admin/media/media-1', {
    method: 'DELETE',
  });
}

describe('DELETE /api/admin/media/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: 'admin-1',
      roles: [{ role: 'ADMIN' }],
    });
    mocks.isAdmin.mockReturnValue(true);
    mocks.db.productMedia.findUnique.mockResolvedValue({
      id: 'media-1',
      storageKey: 'product-media/cover.jpg',
      productId: 'product-1',
    });
    mocks.db.productMedia.delete.mockResolvedValue(undefined);
    mocks.db.auditLog.create.mockResolvedValue(undefined);
    mocks.deleteFile.mockResolvedValue(undefined);
  });

  it('returns 401 when user is unauthenticated', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await DELETE(createRequest() as any, { params: { id: 'media-1' } });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Unauthorized');
  });

  it('returns 403 when user is not admin', async () => {
    mocks.isAdmin.mockReturnValueOnce(false);

    const response = await DELETE(createRequest() as any, { params: { id: 'media-1' } });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe('Forbidden');
  });

  it('returns 404 when media does not exist', async () => {
    mocks.db.productMedia.findUnique.mockResolvedValueOnce(null);

    const response = await DELETE(createRequest() as any, { params: { id: 'media-1' } });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe('Media not found');
  });

  it('deletes media and returns success even if storage cleanup fails', async () => {
    mocks.deleteFile.mockRejectedValueOnce(new Error('storage failure'));

    const response = await DELETE(createRequest() as any, { params: { id: 'media-1' } });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mocks.db.productMedia.delete).toHaveBeenCalledWith({ where: { id: 'media-1' } });
    expect(mocks.db.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
