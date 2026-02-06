import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    getCurrentUser: vi.fn(),
    db: {
      legalDocument: {
        findFirst: vi.fn(),
      },
      legalAcceptance: {
        upsert: vi.fn(),
      },
    },
  };
});

vi.mock('@/lib/supabase/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('@/lib/db', () => ({
  db: mocks.db,
}));

import { POST } from './route';

function createRequest(body: unknown, headers?: Record<string, string>) {
  return new Request('http://localhost/api/legal/accept', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(headers || {}),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/legal/accept', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1' });
    mocks.db.legalDocument.findFirst.mockResolvedValue({
      id: 'doc-tos',
      type: 'TERMS_OF_SERVICE',
      version: '1.0.0',
      effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    mocks.db.legalAcceptance.upsert.mockResolvedValue(undefined);
  });

  it('returns 401 when unauthenticated', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(createRequest({ type: 'TERMS_OF_SERVICE' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Unauthorized');
  });

  it('returns 400 for invalid legal type', async () => {
    const response = await POST(createRequest({ type: 'NOT_A_REAL_TYPE' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain('Missing or invalid');
  });

  it('returns 404 when there is no published document', async () => {
    mocks.db.legalDocument.findFirst.mockResolvedValueOnce(null);

    const response = await POST(createRequest({ type: 'TERMS_OF_SERVICE' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe('No published document found.');
  });

  it('upserts acceptance and returns success payload', async () => {
    const response = await POST(
      createRequest(
        { type: 'TERMS_OF_SERVICE' },
        {
          'x-forwarded-for': '203.0.113.10',
          'user-agent': 'Vitest Agent',
        }
      ) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.accepted).toBe(true);
    expect(mocks.db.legalAcceptance.upsert).toHaveBeenCalledWith({
      where: {
        userId_documentId: {
          userId: 'user-1',
          documentId: 'doc-tos',
        },
      },
      create: {
        userId: 'user-1',
        documentId: 'doc-tos',
        documentType: 'TERMS_OF_SERVICE',
        documentVersion: '1.0.0',
        ipAddress: '203.0.113.10',
        userAgent: 'Vitest Agent',
      },
      update: {},
    });
  });
});
