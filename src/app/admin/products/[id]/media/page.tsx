import Link from 'next/link';
import { notFound } from 'next/navigation';
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
          {mediaWithUrls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No media attached to this product.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Order</TableHead>
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
                    <TableCell>{item.mediaType}</TableCell>
                    <TableCell>{item.displayOrder}</TableCell>
                    <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <AdminMediaDeleteButton mediaId={item.id} />
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
