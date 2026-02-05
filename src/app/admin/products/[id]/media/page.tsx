import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { generateDownloadUrl } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminMediaReorderList } from '@/components/admin/AdminMediaReorderList';

export const dynamic = 'force-dynamic';

export default async function AdminProductMediaPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await db.product.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      slug: true,
      media: {
        orderBy: { displayOrder: 'asc' },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const mediaWithUrls = await Promise.all(
    product.media.map(async (item) => {
      try {
        const url = await generateDownloadUrl(item.storageKey, 3600, 'PREVIEW');
        return { ...item, url };
      } catch (error) {
        console.warn('Failed to generate media URL:', error);
        return { ...item, url: null };
      }
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Media</h1>
            <p className="text-muted-foreground">
              {product.title}
            </p>
          </div>
          <Link
            href={`/p/${product.slug}`}
            className="text-sm text-primary underline underline-offset-4"
          >
            View listing
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Media</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminMediaReorderList productId={product.id} media={mediaWithUrls} />
        </CardContent>
      </Card>
    </div>
  );
}
