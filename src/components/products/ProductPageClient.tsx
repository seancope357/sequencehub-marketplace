"use client";

import { useRouter } from 'next/navigation';
import {
  Package,
  Download,
  Clock,
  CheckCircle,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { AppHeader } from '@/components/navigation/AppHeader';
import { BuyNowButton } from '@/components/checkout/BuyNowButton';

interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  price: number;
  includesFSEQ: boolean;
  includesSource: boolean;
  xLightsVersionMin?: string;
  xLightsVersionMax?: string;
  targetUse?: string;
  expectedProps?: string;
  licenseType: string;
  seatCount?: number;
  creator: {
    id: string;
    name: string;
    avatar?: string;
  };
  media: {
    storageKey: string;
    mediaType: string;
    mimeType?: string | null;
    url?: string | null;
  }[];
  versions: {
    id: string;
    versionNumber: number;
    versionName: string;
    changelog?: string;
    publishedAt?: string;
  }[];
  files: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    sequenceLength?: number;
    fps?: number;
    channelCount?: number;
  }[];
  saleCount: number;
  viewCount: number;
  purchased?: boolean;
}

interface ProductPageClientProps {
  product: Product;
}

export function ProductPageClient({ product }: ProductPageClientProps) {
  const router = useRouter();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader browseLabel="Browse" browseHref="/browse" />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Media */}
          <div className="space-y-4">
            {product.media.length === 0 ? (
              <>
                <Card>
                  <CardContent className="p-0">
                    <div className="aspect-video bg-muted relative overflow-hidden rounded-t-lg">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Package className="h-24 w-24 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="text-sm text-muted-foreground">
                  No preview images available.
                </div>
              </>
            ) : (
              <>
                {(() => {
                  const cover =
                    product.media.find((item) => item.mediaType === 'cover') || product.media[0];
                  if (!cover?.url) {
                    return (
                      <Card>
                        <CardContent className="p-0">
                          <div className="aspect-video bg-muted relative overflow-hidden rounded-t-lg" />
                        </CardContent>
                      </Card>
                    );
                  }

                  const isVideo = cover.mimeType?.startsWith('video/');

                  return (
                    <Card>
                      <CardContent className="p-0">
                        <div className="aspect-video bg-muted relative overflow-hidden rounded-t-lg">
                          {isVideo ? (
                            <video
                              src={cover.url}
                              className="h-full w-full object-cover"
                              controls
                            />
                          ) : (
                            <img
                              src={cover.url}
                              alt={product.title}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                <div className="grid grid-cols-4 gap-2">
                  {product.media
                    .filter((item) => item.mediaType !== 'cover')
                    .slice(0, 8)
                    .map((item) => (
                      <div
                        key={item.storageKey}
                        className="aspect-square rounded border overflow-hidden bg-muted"
                      >
                        {item.url ? (
                          item.mimeType?.startsWith('video/') ? (
                            <video src={item.url} className="h-full w-full object-cover" />
                          ) : (
                            <img
                              src={item.url}
                              alt={product.title}
                              className="h-full w-full object-cover"
                            />
                          )
                        ) : null}
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="space-y-6">
            <div>
              <Badge className="mb-2">{product.category}</Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{product.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  {product.saleCount} purchases
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {product.viewCount} views
                </div>
              </div>
            </div>

            <Separator />

            {/* Creator Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-sm font-semibold">
                    {product.creator.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold">{product.creator.name}</div>
                    <div className="text-sm text-muted-foreground">Creator</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Price & Actions */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-3xl font-bold">
                      {product.price === 0 ? 'Free' : `$${product.price.toFixed(2)}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {product.licenseType === 'COMMERCIAL' && 'Commercial License'}
                      {product.licenseType === 'PERSONAL' && 'Personal License'}
                    </div>
                  </div>
                </div>

                <BuyNowButton
                  productId={product.id}
                  productSlug={product.slug}
                  price={product.price}
                  alreadyOwned={product.purchased}
                  className="w-full"
                  size="lg"
                />
              </CardContent>
            </Card>

            {/* Details Tabs */}
            <Tabs defaultValue="description">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="specs">Specifications</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="prose prose-sm max-w-none">
                      {product.description}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="specs" className="space-y-4">
                <Card>
                  <CardHeader>Compatibility</CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">xLights Version</span>
                      <span className="font-medium">
                        {product.xLightsVersionMin || 'Any'}
                        {product.xLightsVersionMax && ` - ${product.xLightsVersionMax}`}
                      </span>
                    </div>
                    {product.targetUse && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target Use</span>
                        <span className="font-medium">{product.targetUse}</span>
                      </div>
                    )}
                    {product.expectedProps && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expected Props</span>
                        <span className="font-medium">{product.expectedProps}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>License</CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <Badge variant={product.licenseType === 'COMMERCIAL' ? 'default' : 'secondary'}>
                        {product.licenseType}
                      </Badge>
                    </div>
                    {product.licenseType === 'COMMERCIAL' && product.seatCount && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Seat Count</span>
                        <span className="font-medium">{product.seatCount}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="files" className="space-y-4">
                <Card>
                  <CardHeader>Included Files</CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2 mb-4">
                      {product.includesFSEQ && (
                        <Badge variant="default">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Includes FSEQ
                        </Badge>
                      )}
                      {product.includesSource && (
                        <Badge variant="default">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Includes Source
                        </Badge>
                      )}
                    </div>

                    {product.files.map((file) => (
                      <div key={file.id} className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{file.fileName}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {file.fileType}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Size:</span>{' '}
                            {formatFileSize(file.fileSize)}
                          </div>
                          {file.sequenceLength && (
                            <div>
                              <span className="text-muted-foreground">Duration:</span>{' '}
                              {formatDuration(file.sequenceLength)}
                            </div>
                          )}
                          {file.fps && (
                            <div>
                              <span className="text-muted-foreground">FPS:</span> {file.fps}
                            </div>
                          )}
                          {file.channelCount && (
                            <div>
                              <span className="text-muted-foreground">Channels:</span>{' '}
                              {file.channelCount}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {product.versions.length > 0 && (
                  <Card>
                    <CardHeader>Version History</CardHeader>
                    <CardContent className="space-y-3">
                      {product.versions.map((version) => (
                        <div key={version.id} className="border-l-2 border-primary pl-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{version.versionName}</span>
                            {version.publishedAt && (
                              <span className="text-sm text-muted-foreground">
                                {new Date(version.publishedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {version.changelog && (
                            <p className="text-sm text-muted-foreground mt-1">{version.changelog}</p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
