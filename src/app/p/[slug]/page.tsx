'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Package,
  Download,
  Clock,
  AlertCircle,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { isAuthenticated, user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (slug) {
      loadProduct();
    }
  }, [slug]);

  const loadProduct = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/products/${slug}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data.product);
      } else if (response.status === 404) {
        toast.error('Product not found');
      }
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Failed to load product');
    } finally {
      setIsLoading(false);
    }
  };


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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <div className="flex gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-20 rounded" />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Product Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push('/')}>
              Back to Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const coverImage = product.media.find((m) => m.mediaType === 'cover');
  const galleryImages = product.media.filter((m) => m.mediaType === 'gallery');

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Images */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video bg-muted relative overflow-hidden rounded-t-lg">
                  {coverImage ? (
                    <img
                      src={`/api/media/${coverImage.storageKey}`}
                      alt={product.title}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="h-24 w-24 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {galleryImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {galleryImages.map((image, index) => (
                  <Card
                    key={image.id}
                    className={`cursor-pointer transition-all ${
                      selectedImage === index ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <CardContent className="p-1">
                      <div className="aspect-video bg-muted rounded overflow-hidden">
                        <img
                          src={`/api/media/${image.storageKey}`}
                          alt={`${product.title} ${index + 1}`}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-sm font-semibold">
                      {product.creator.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold">{product.creator.name}</div>
                      <div className="text-sm text-muted-foreground">Creator</div>
                    </div>
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
                  alreadyPurchased={product.purchased}
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
                          <Download className="h-3 w-3 mr-1" />
                          Includes FSEQ
                        </Badge>
                      )}
                      {product.includesSource && (
                        <Badge variant="default">
                          <Download className="h-3 w-3 mr-1" />
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
