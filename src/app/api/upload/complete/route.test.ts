import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    getCurrentUser: vi.fn(),
    getUploadSession: vi.fn(),
    updateUploadSession: vi.fn(),
    combineChunks: vi.fn(),
    getFinalFilePath: vi.fn(),
    deleteUploadSession: vi.fn(),
    calculateFileSHA256: vi.fn(),
    generateStorageKey: vi.fn(),
    extractMetadata: vi.fn(),
    uploadFile: vi.fn(),
    validateFileIntegrity: vi.fn(),
    fsOpen: vi.fn(),
    db: {
      productFile: {
        findFirst: vi.fn(),
        create: vi.fn(),
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

vi.mock('@/lib/upload/session', () => ({
  getUploadSession: mocks.getUploadSession,
  updateUploadSession: mocks.updateUploadSession,
  combineChunks: mocks.combineChunks,
  getFinalFilePath: mocks.getFinalFilePath,
  deleteUploadSession: mocks.deleteUploadSession,
}));

vi.mock('@/lib/upload/hash', () => ({
  calculateFileSHA256: mocks.calculateFileSHA256,
  generateStorageKey: mocks.generateStorageKey,
}));

vi.mock('@/lib/upload/metadata', () => ({
  extractMetadata: mocks.extractMetadata,
}));

vi.mock('@/lib/storage', () => ({
  uploadFile: mocks.uploadFile,
}));

vi.mock('@/lib/upload/validation', () => ({
  validateFileIntegrity: mocks.validateFileIntegrity,
}));

vi.mock('@/lib/db', () => ({
  db: mocks.db,
}));

vi.mock('fs/promises', () => ({
  default: {
    open: mocks.fsOpen,
  },
}));

import { POST } from './route';

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/upload/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/upload/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getCurrentUser.mockResolvedValue({ id: 'creator-1' });
    mocks.getUploadSession.mockResolvedValue({
      uploadId: 'upload-1',
      userId: 'creator-1',
      fileName: 'show.fseq',
      fileSize: 2048,
      fileType: 'RENDERED',
      mimeType: 'application/octet-stream',
      totalChunks: 1,
      uploadedChunks: [0],
      versionId: 'version-1',
    });
    mocks.updateUploadSession.mockResolvedValue(undefined);
    mocks.combineChunks.mockResolvedValue(undefined);
    mocks.getFinalFilePath.mockReturnValue('/tmp/final-show.fseq');
    mocks.deleteUploadSession.mockResolvedValue(undefined);
    mocks.calculateFileSHA256.mockResolvedValue('sha256-1');
    mocks.generateStorageKey.mockReturnValue('product-files/show.fseq');
    mocks.extractMetadata.mockResolvedValue({ sequenceLength: 32, fps: 20, channelCount: 1024 });
    mocks.uploadFile.mockResolvedValue(undefined);
    mocks.validateFileIntegrity.mockReturnValue({ valid: true, errors: [] });
    mocks.fsOpen.mockResolvedValue({
      read: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    });
    mocks.db.productFile.findFirst.mockResolvedValue(null);
    mocks.db.productFile.create.mockResolvedValue({ id: 'file-1' });
    mocks.db.auditLog.create.mockResolvedValue(undefined);
  });

  it('returns 401 when unauthenticated', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(createRequest({ uploadId: 'upload-1' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Unauthorized');
  });

  it('returns 400 when uploadId is missing', async () => {
    const response = await POST(createRequest({}) as any);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Missing required field: uploadId');
  });

  it('returns 400 when not all chunks are uploaded', async () => {
    mocks.getUploadSession.mockResolvedValueOnce({
      uploadId: 'upload-1',
      userId: 'creator-1',
      totalChunks: 2,
      uploadedChunks: [0],
    });

    const response = await POST(createRequest({ uploadId: 'upload-1' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Not all chunks uploaded');
  });

  it('returns deduplicated response when file hash already exists', async () => {
    mocks.db.productFile.findFirst.mockResolvedValueOnce({
      id: 'file-existing',
      storageKey: 'product-files/existing.fseq',
      metadata: null,
      fileHash: 'sha256-1',
      mimeType: 'application/octet-stream',
      sequenceLength: 30,
      fps: 20,
      channelCount: 800,
    });

    const response = await POST(createRequest({ uploadId: 'upload-1' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.deduplicated).toBe(true);
    expect(payload.fileId).toBe('file-existing');
    expect(payload.storageKey).toBe('product-files/existing.fseq');
    expect(mocks.db.productFile.create).not.toHaveBeenCalled();
  });

  it('creates product file and returns completion payload for new file', async () => {
    const response = await POST(createRequest({ uploadId: 'upload-1' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.deduplicated).toBe(false);
    expect(payload.fileId).toBe('file-1');
    expect(payload.storageKey).toBe('product-files/show.fseq');
    expect(payload.sequenceLength).toBe(32);
    expect(mocks.uploadFile).toHaveBeenCalledTimes(1);
    expect(mocks.db.productFile.create).toHaveBeenCalledTimes(1);
    expect(mocks.deleteUploadSession).toHaveBeenCalledWith('upload-1');
  });
});
