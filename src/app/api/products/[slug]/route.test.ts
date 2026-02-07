import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    getCurrentUser: vi.fn(),
    generateDownloadUrl: vi.fn(),
    db: {
      product: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      entitlement: {
        findFirst: vi.fn(),
      },
    },
  };
});

vi.mock('@/lib/supabase/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('@/lib/storage', () => ({
  generateDownloadUrl: mocks.generateDownloadUrl,
}));

vi.mock('@/lib/db', () => ({
  db: mocks.db,
}));

import { GET } from './route';

function createParams(slug: string) {
  return { params: { slug } };
}

describe('GET /api/products/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateDownloadUrl.mockResolvedValue('https://example.com/media');
    mocks.db.product.update.mockResolvedValue({ id: 'product-1' });
    mocks.db.entitlement.findFirst.mockResolvedValue(null);
  });

  it('returns 404 for unpublished product to public users', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    mocks.db.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      creatorId: 'creator-1',
      slug: 'draft-product',
      title: 'Draft Product',
      description: 'Draft description',
      category: 'CHRISTMAS',
      status: 'DRAFT',
      prices: [{ amount: 10 }],
      includesFSEQ: true,
      includesSource: false,
      xLightsVersionMin: null,
      xLightsVersionMax: null,
      targetUse: null,
      expectedProps: null,
      licenseType: 'PERSONAL',
      seatCount: null,
      creator: { id: 'creator-1', name: 'Creator', email: 'creator@example.com', avatar: null },
      media: [],
      versions: [],
      files: [],
      saleCount: 0,
      viewCount: 0,
    });

    const response = await GET(new Request('http://localhost/api/products/draft-product') as any, createParams('draft-product') as any);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe('Product not found');
    expect(mocks.db.product.update).not.toHaveBeenCalled();
  });

  it('allows owner to fetch unpublished product', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 'creator-1',
      roles: [{ role: 'CREATOR' }],
    });

    mocks.db.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      creatorId: 'creator-1',
      slug: 'draft-product',
      title: 'Draft Product',
      description: 'Draft description',
      category: 'CHRISTMAS',
      status: 'DRAFT',
      prices: [{ amount: 10 }],
      includesFSEQ: true,
      includesSource: false,
      xLightsVersionMin: null,
      xLightsVersionMax: null,
      targetUse: null,
      expectedProps: null,
      licenseType: 'PERSONAL',
      seatCount: null,
      creator: { id: 'creator-1', name: 'Creator', email: 'creator@example.com', avatar: null },
      media: [],
      versions: [],
      files: [],
      saleCount: 0,
      viewCount: 0,
    });

    const response = await GET(new Request('http://localhost/api/products/draft-product') as any, createParams('draft-product') as any);

    expect(response.status).toBe(200);
    expect(mocks.db.product.update).toHaveBeenCalled();
  });
});
