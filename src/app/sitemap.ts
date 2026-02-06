import { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

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

  // In some build environments (e.g., Vercel previews), DATABASE_URL can be absent.
  // Return static routes instead of triggering Prisma initialization errors.
  if (!process.env.DATABASE_URL) {
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
    console.error('Failed to generate sitemap:', error);
    return staticRoutes;
  }
}
