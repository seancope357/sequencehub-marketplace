import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    getCurrentUser: vi.fn(),
    createAuditLog: vi.fn(),
    db: {
      entitlement: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      downloadToken: {
        create: vi.fn(),
      },
    },
  };
});

vi.mock('@/lib/supabase/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
  createAuditLog: mocks.createAuditLog,
}));

vi.mock('@/lib/db', () => ({
  db: mocks.db,
}));

import { POST } from './route';

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/library/download', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/library/download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DOWNLOAD_SECRET = 'test-download-secret';
    mocks.getCurrentUser.mockResolvedValue({
      id: 'buyer-1',
      email: 'buyer@example.com',
    });
    mocks.db.entitlement.update.mockResolvedValue({ id: 'entitlement-1' });
    mocks.db.downloadToken.create.mockResolvedValue({ id: 'token-1' });
  });

  it('returns 401 for unauthenticated users', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(
      createRequest({ entitlementId: 'entitlement-1', fileVersionId: 'version-1' }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Unauthorized');
  });

  it('returns 403 when entitlement is missing and logs denied access', async () => {
    mocks.db.entitlement.findFirst.mockResolvedValueOnce(null);

    const response = await POST(
      createRequest({ entitlementId: 'entitlement-1', fileVersionId: 'version-1' }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe('No valid entitlement found');
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DOWNLOAD_ACCESS_DENIED',
        entityId: 'entitlement-1',
      })
    );
  });

  it('returns signed download URLs when entitlement is valid', async () => {
    mocks.db.entitlement.findFirst.mockResolvedValueOnce({
      id: 'entitlement-1',
      userId: 'buyer-1',
      isActive: true,
      lastDownloadAt: null,
      downloadCount: 0,
      product: {
        versions: [
          {
            id: 'version-1',
            files: [
              {
                id: 'file-1',
                fileName: 'show.fseq',
                fileSize: 1234,
                fileType: 'RENDERED',
                storageKey: 'product-files/show.fseq',
              },
            ],
          },
        ],
      },
    });

    const response = await POST(
      createRequest({ entitlementId: 'entitlement-1', fileVersionId: 'version-1' }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.downloadUrls).toHaveLength(1);
    expect(payload.downloadUrls[0].fileName).toBe('show.fseq');
    expect(payload.downloadUrls[0].downloadUrl).toContain('/api/media/product-files/show.fseq');
    expect(payload.downloadUrls[0].downloadUrl).toContain('token=');
    expect(mocks.db.downloadToken.create).toHaveBeenCalledTimes(1);
    expect(mocks.db.entitlement.update).toHaveBeenCalledWith({
      where: { id: 'entitlement-1' },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadAt: expect.any(Date),
      },
    });
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DOWNLOAD_ACCESS_GRANTED',
        entityId: 'entitlement-1',
      })
    );
  });
});
