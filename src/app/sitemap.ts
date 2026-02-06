import { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

// Avoid build-time DB coupling in environments where DB access may be unavailable.
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      changefreq: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/browse'),
      changefreq: 'daily',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/legal/terms'),
      changefreq: 'yearly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/legal/privacy'),
      changefreq: 'yearly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/legal/refunds'),
      changefreq: 'yearly',
      priority: 0.3,
    },
  ];

  const databaseUrl = process.env.DATABASE_URL;

  // Return static routes when DB configuration is unavailable or obviously placeholder.
  if (
    !databaseUrl ||
    databaseUrl.includes('YOUR-PASSWORD') ||
    databaseUrl.includes('your_password')
  ) {
    return staticRoutes;
  }

  try {
    const { db } = await import('@/lib/db');
    const products = await db.product.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
    });

    const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
      url: absoluteUrl(`/p/${product.slug}`),
      lastModified: product.updatedAt,
      changefreq: 'weekly',
      priority: 0.7,
    }));

    return [...staticRoutes, ...productRoutes];
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to generate sitemap:', error);
    }
    return staticRoutes;
  }
}
