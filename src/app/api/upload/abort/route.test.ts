import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    getCurrentUser: vi.fn(),
    applyRateLimit: vi.fn(),
    getUploadSession: vi.fn(),
    abortUploadSession: vi.fn(),
    db: {
      auditLog: {
        create: vi.fn(),
      },
    },
  };
});

vi.mock('@/lib/supabase/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('@/lib/rate-limit', () => ({
  applyRateLimit: mocks.applyRateLimit,
  RATE_LIMIT_CONFIGS: {
    UPLOAD_FILE: {},
  },
}));

vi.mock('@/lib/upload/session', () => ({
  getUploadSession: mocks.getUploadSession,
  abortUploadSession: mocks.abortUploadSession,
}));

vi.mock('@/lib/db', () => ({
  db: mocks.db,
}));

import { POST } from './route';

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/upload/abort', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/upload/abort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: 'creator-1' });
    mocks.applyRateLimit.mockResolvedValue({ allowed: true });
    mocks.getUploadSession.mockResolvedValue({
      uploadId: 'upload-1',
      userId: 'creator-1',
      fileName: 'show.fseq',
      uploadedChunks: [0],
      totalChunks: 2,
    });
    mocks.abortUploadSession.mockResolvedValue(undefined);
    mocks.db.auditLog.create.mockResolvedValue(undefined);
  });

  it('returns 401 when unauthenticated', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(createRequest({ uploadId: 'upload-1' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Unauthorized');
  });

  it('returns 404 when upload session does not exist', async () => {
    mocks.getUploadSession.mockResolvedValueOnce(null);

    const response = await POST(createRequest({ uploadId: 'upload-1' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe('Upload session not found');
  });

  it('aborts session and returns success', async () => {
    const response = await POST(createRequest({ uploadId: 'upload-1' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mocks.abortUploadSession).toHaveBeenCalledWith('upload-1');
    expect(mocks.db.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
