import Link from 'next/link';
import { db } from '@/lib/db';
import { generateDownloadUrl } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminMediaDeleteButton } from '@/components/admin/AdminMediaDeleteButton';

export const dynamic = 'force-dynamic';

export default async function AdminMediaPage() {
  const media = await db.productMedia.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          creator: { select: { name: true, email: true } },
        },
      },
    },
  });

  const mediaWithUrls = await Promise.all(
    media.map(async (item) => {
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
        <h1 className="text-3xl font-bold">Media Moderation</h1>
        <p className="text-muted-foreground">
          Latest 100 media assets across the marketplace.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Media Library</CardTitle>
        </CardHeader>
        <CardContent>
          {mediaWithUrls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No media assets found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mediaWithUrls.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="h-16 w-16 overflow-hidden rounded border bg-muted">
                        {item.url ? (
                          item.mimeType?.startsWith('video/') ? (
                            <video src={item.url} className="h-full w-full object-cover" />
                          ) : (
                            <img src={item.url} alt={item.fileName} className="h-full w-full object-cover" />
                          )
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{item.product?.title || 'Unknown product'}</div>
                        {item.product?.slug ? (
                          <Link
                            href={`/p/${item.product.slug}`}
                            className="text-xs text-primary underline underline-offset-4"
                          >
                            View listing
                          </Link>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.product?.creator?.name || item.product?.creator?.email || 'Unknown'}
                    </TableCell>
                    <TableCell>{item.mediaType}</TableCell>
                    <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.product?.id ? (
                          <Link
                            href={`/admin/products/${item.product.id}/media`}
                            className="text-sm text-primary underline underline-offset-4"
                          >
                            Manage
                          </Link>
                        ) : null}
                        <AdminMediaDeleteButton mediaId={item.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
