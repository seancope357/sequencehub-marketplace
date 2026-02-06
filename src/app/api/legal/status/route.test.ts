import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    getCurrentUser: vi.fn(),
    db: {
      legalDocument: {
        findFirst: vi.fn(),
      },
      legalAcceptance: {
        findMany: vi.fn(),
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

import { GET } from './route';

function createRequest() {
  return new Request('http://localhost/api/legal/status', {
    method: 'GET',
  });
}

describe('GET /api/legal/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1' });
  });

  it('returns 401 when unauthenticated', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await GET(createRequest() as any);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Unauthorized');
  });

  it('returns accepted=true when there are no published legal docs', async () => {
    mocks.db.legalDocument.findFirst.mockResolvedValue(null);
    mocks.db.legalAcceptance.findMany.mockResolvedValue([]);

    const response = await GET(createRequest() as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.needsAcceptance).toBe(false);
    expect(payload.data.documents).toHaveLength(3);
    expect(payload.data.documents.every((doc: any) => doc.accepted === true)).toBe(true);
  });

  it('returns needsAcceptance=true when a published document is not accepted', async () => {
    mocks.db.legalDocument.findFirst
      .mockResolvedValueOnce({
        id: 'doc-tos',
        type: 'TERMS_OF_SERVICE',
        version: '1.0.0',
        effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    mocks.db.legalAcceptance.findMany.mockResolvedValue([]);

    const response = await GET(createRequest() as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.needsAcceptance).toBe(true);
    expect(payload.data.documents[0].type).toBe('TERMS_OF_SERVICE');
    expect(payload.data.documents[0].accepted).toBe(false);
  });
});
