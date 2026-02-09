'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Package,
  Plus,
  Download,
  Calendar,
  FileText,
  ArrowLeft,
  Edit,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { AppHeader } from '@/components/navigation/AppHeader';
import { BuyNowButton } from '@/components/checkout/BuyNowButton';

interface ProductFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

interface ProductVersion {
  id: string;
  versionNumber: number;
  versionName: string;
  changelog: string | null;
  isLatest: boolean;
  publishedAt: string | null;
  createdAt: string;
  files: ProductFile[];
}

interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  versions: ProductVersion[];
  prices: Array<{ amount: number; currency: string }>;
}

export default function ProductDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;
  const { user, isAuthenticated, isCreatorOrAdmin, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (!isCreatorOrAdmin) {
      router.push('/dashboard/creator/onboarding');
      return;
    }

    loadProduct();
  }, [isAuthenticated, isCreatorOrAdmin, authLoading, router, productId]);

  const loadProduct = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/dashboard/products/${productId}`);

      if (!response.ok) {
        toast.error('Failed to load product');
        router.push('/dashboard/products');
        return;
      }

      const data = await response.json();
      setProduct(data.product);
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Failed to load product');
      router.push('/dashboard/products');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user || !product) {
    return null;
  }

  const currentPrice = product.prices[0]?.amount || 0;
  const latestVersion = product.versions.find(v => v.isLatest);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader contextLabel={product.title} />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/products')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/products/${productId}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Product
              </Button>
              <Button
                size="sm"
                onClick={() => router.push(`/dashboard/products/${productId}/versions/new`)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Version
              </Button>
            </div>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-2xl">{product.title}</CardTitle>
                      <Badge variant={product.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                        {product.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Tag className="h-4 w-4" />
                        {product.category}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Created {formatDate(product.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">
                      ${currentPrice.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">USD</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
                </div>
              </CardContent>
            </Card>

            {product.status === 'PUBLISHED' && (
              <Card>
                <CardHeader>
                  <CardTitle>Buyer Preview</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    This is how buyers will see your product
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{product.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                      <div className="mt-2">
                        <span className="text-2xl font-bold">${currentPrice.toFixed(2)}</span>
                        <span className="text-sm text-muted-foreground ml-1">USD</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <BuyNowButton
                        productId={product.id}
                        productSlug={product.slug}
                        price={currentPrice}
                        alreadyOwned={false}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Note: You can test the checkout flow, but you won't be charged for your own products.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Versions ({product.versions.length})</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/products/${productId}/versions/new`)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Version
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {product.versions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No versions yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => router.push(`/dashboard/products/${productId}/versions/new`)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Version
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {product.versions.map((version) => (
                      <div
                        key={version.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">
                                Version {version.versionNumber}: {version.versionName}
                              </h3>
                              {version.isLatest && (
                                <Badge variant="default">Latest</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(version.createdAt)}
                              </div>
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {version.files.length} file{version.files.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </div>

                        {version.changelog && (
                          <div className="bg-muted/50 rounded p-3">
                            <p className="text-sm font-semibold mb-1">Changelog:</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {version.changelog}
                            </p>
                          </div>
                        )}

                        {version.files.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-semibold">Files:</p>
                            <div className="grid gap-2">
                              {version.files.map((file) => (
                                <div
                                  key={file.id}
                                  className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <Download className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{file.fileName}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {file.fileType}
                                    </Badge>
                                  </div>
                                  <span className="text-muted-foreground">
                                    {formatFileSize(file.fileSize)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
