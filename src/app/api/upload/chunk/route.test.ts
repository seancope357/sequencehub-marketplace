import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    getCurrentUser: vi.fn(),
    getUploadSession: vi.fn(),
    updateUploadSession: vi.fn(),
    storeChunk: vi.fn(),
    validateChunkHash: vi.fn(),
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

vi.mock('@/lib/upload/session', () => ({
  getUploadSession: mocks.getUploadSession,
  updateUploadSession: mocks.updateUploadSession,
  storeChunk: mocks.storeChunk,
}));

vi.mock('@/lib/upload/validation', () => ({
  validateChunkHash: mocks.validateChunkHash,
}));

vi.mock('@/lib/db', () => ({
  db: mocks.db,
}));

import { POST } from './route';

function createRequest(formData: FormData) {
  return new Request('http://localhost/api/upload/chunk', {
    method: 'POST',
    body: formData,
  });
}

function createValidFormData() {
  const formData = new FormData();
  formData.append('uploadId', 'upload-1');
  formData.append('chunkIndex', '0');
  formData.append('chunkHash', 'hash-1');
  formData.append('chunk', new File([new Uint8Array([1, 2, 3])], 'chunk.bin'));
  return formData;
}

describe('POST /api/upload/chunk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: 'creator-1' });
    mocks.getUploadSession.mockResolvedValue({
      uploadId: 'upload-1',
      userId: 'creator-1',
      status: 'UPLOADING',
      expiresAt: new Date(Date.now() + 60_000),
      totalChunks: 2,
      uploadedChunks: [],
    });
    mocks.validateChunkHash.mockReturnValue(true);
    mocks.storeChunk.mockResolvedValue(undefined);
    mocks.updateUploadSession.mockResolvedValue(undefined);
    mocks.db.auditLog.create.mockResolvedValue(undefined);
  });

  it('returns 401 when unauthenticated', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(createRequest(createValidFormData()) as any);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Unauthorized');
  });

  it('returns 404 when upload session is missing', async () => {
    mocks.getUploadSession.mockResolvedValueOnce(null);

    const response = await POST(createRequest(createValidFormData()) as any);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe('Upload session not found');
  });

  it('returns 400 and logs security alert when chunk hash mismatches', async () => {
    mocks.validateChunkHash.mockReturnValueOnce(false);

    const response = await POST(createRequest(createValidFormData()) as any);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain('Chunk hash mismatch');
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'SECURITY_ALERT',
        }),
      })
    );
  });

  it('stores chunk and updates upload progress', async () => {
    const response = await POST(createRequest(createValidFormData()) as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.progress).toBe(0.5);
    expect(mocks.storeChunk).toHaveBeenCalledTimes(1);
    expect(mocks.updateUploadSession).toHaveBeenCalledWith(
      'upload-1',
      expect.objectContaining({
        uploadedChunks: [0],
        status: 'UPLOADING',
      })
    );
  });
});
