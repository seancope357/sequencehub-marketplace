import { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/dashboard',
          '/api',
          '/auth',
          '/library',
        ],
      },
    ],
    sitemap: `${getBaseUrl()}/sitemap.xml`,
  };
}
