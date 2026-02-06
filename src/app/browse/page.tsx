import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { ProductStatus } from '@prisma/client';
import { BrowsePageClient } from '@/components/browse/BrowsePageClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Browse xLights Sequences | SequenceHUB',
  description: 'Browse xLights sequences, filter by category, and discover new lighting designs from verified creators.',
  alternates: {
    canonical: '/browse',
  },
  openGraph: {
    title: 'Browse xLights Sequences | SequenceHUB',
    description: 'Discover professional xLights sequences ready for your next show.',
    url: '/browse',
    type: 'website',
  },
};

export default async function BrowsePage() {
  const products = await db.product.findMany({
    where: { status: ProductStatus.PUBLISHED },
    orderBy: { createdAt: 'desc' },
    include: {
      prices: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const initialProducts = products.map((product) => ({
    id: product.id,
    slug: product.slug,
    title: product.title,
    description: product.description,
    category: product.category,
    price: product.prices[0]?.amount || 0,
    includesFSEQ: product.includesFSEQ,
    includesSource: product.includesSource,
    saleCount: product.saleCount,
  }));

  return <BrowsePageClient initialProducts={initialProducts} />;
}
