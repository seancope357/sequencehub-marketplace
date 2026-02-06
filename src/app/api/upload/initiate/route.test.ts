import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    getCurrentUser: vi.fn(),
    validateFile: vi.fn(),
    generateUploadId: vi.fn(),
    createUploadSession: vi.fn(),
    db: {
      product: {
        findUnique: vi.fn(),
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

vi.mock('@/lib/upload/validation', () => ({
  validateFile: mocks.validateFile,
}));

vi.mock('@/lib/upload/hash', () => ({
  generateUploadId: mocks.generateUploadId,
}));

vi.mock('@/lib/upload/session', () => ({
  createUploadSession: mocks.createUploadSession,
}));

vi.mock('@/lib/db', () => ({
  db: mocks.db,
}));

import { POST } from './route';

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/upload/initiate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/upload/initiate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: 'creator-1' });
    mocks.validateFile.mockReturnValue({ valid: true, errors: [], warnings: [] });
    mocks.generateUploadId.mockReturnValue('upload-1');
    mocks.createUploadSession.mockResolvedValue(undefined);
    mocks.db.product.findUnique.mockResolvedValue({ id: 'product-1', creatorId: 'creator-1' });
    mocks.db.auditLog.create.mockResolvedValue(undefined);
  });

  it('returns 401 for unauthenticated users', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(createRequest({}) as any);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Unauthorized');
  });

  it('returns 400 for invalid file payload', async () => {
    mocks.validateFile.mockReturnValueOnce({
      valid: false,
      errors: ['Unsupported file type'],
      warnings: [],
    });

    const response = await POST(
      createRequest({
        fileName: 'bad.exe',
        fileSize: 1024,
        mimeType: 'application/octet-stream',
        uploadType: 'SOURCE',
      }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('File validation failed');
    expect(payload.errors).toContain('Unsupported file type');
  });

  it('returns 403 when product ownership check fails', async () => {
    mocks.db.product.findUnique.mockResolvedValueOnce({ id: 'product-1', creatorId: 'other-user' });

    const response = await POST(
      createRequest({
        fileName: 'show.fseq',
        fileSize: 1024,
        mimeType: 'application/octet-stream',
        uploadType: 'RENDERED',
        productId: 'product-1',
      }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe('Product not found or access denied');
  });

  it('creates upload session and returns upload details', async () => {
    const response = await POST(
      createRequest({
        fileName: 'show.fseq',
        fileSize: 1024,
        mimeType: 'application/octet-stream',
        uploadType: 'RENDERED',
        productId: 'product-1',
        versionId: 'version-1',
      }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.uploadId).toBe('upload-1');
    expect(payload.totalChunks).toBe(1);
    expect(typeof payload.chunkSize).toBe('number');
    expect(mocks.createUploadSession).toHaveBeenCalledTimes(1);
    expect(mocks.db.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
