'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  Download,
  Calendar,
  Eye,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { AppHeader } from '@/components/navigation/AppHeader';

interface Purchase {
  id: string;
  orderNumber: string;
  product: {
    id: string;
    slug: string;
    title: string;
    category: string;
    description: string;
    includesFSEQ: boolean;
    includesSource: boolean;
  };
  version: {
    id: string;
    versionNumber: number;
    versionName: string;
    publishedAt: string;
  };
  price: number;
  purchasedAt: string;
}

export default function Library() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    loadPurchases();
  }, [isAuthenticated, authLoading, router]);

  const loadPurchases = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/library');
      if (response.ok) {
        const data = await response.json();
        setPurchases(data.purchases || []);
      }
    } catch (error) {
      console.error('Error loading purchases:', error);
      toast.error('Failed to load purchases');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (entitlementId: string, fileVersionId: string) => {
    try {
      const response = await fetch('/api/library/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entitlementId, fileVersionId }),
      });

      if (!response.ok) {
        toast.error('Failed to start download');
        return;
      }

      const data = await response.json();
      const downloadUrls = data.downloadUrls || [];
      if (downloadUrls.length === 0) {
        toast.error('No download links available');
        return;
      }

      downloadUrls.forEach((item: { downloadUrl: string }) => {
        if (item?.downloadUrl) {
          window.open(item.downloadUrl, '_blank');
        }
      });

      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error('Failed to start download');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader contextLabel="My Library" browseLabel="Browse" browseHref="/browse" />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">My Library</h1>
          <p className="text-muted-foreground">
            Manage your purchased sequences
          </p>
        </div>

        {purchases.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No purchases yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by exploring the marketplace
              </p>
              <Button onClick={() => router.push('/')}>
                Browse Marketplace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {purchases.map((purchase) => (
              <Card key={purchase.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{purchase.product.category}</Badge>
                        <Badge variant="outline">Order #{purchase.orderNumber}</Badge>
                      </div>
                      <CardTitle className="text-xl">{purchase.product.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {purchase.product.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {formatCurrency(purchase.price)}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(purchase.purchasedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Product Info */}
                    <div className="flex flex-wrap gap-2">
                      {purchase.product.includesFSEQ && (
                        <Badge variant="outline">
                          <FileText className="h-3 w-3 mr-1" />
                          Includes FSEQ
                        </Badge>
                      )}
                      {purchase.product.includesSource && (
                        <Badge variant="outline">
                          <FileText className="h-3 w-3 mr-1" />
                          Includes Source
                        </Badge>
                      )}
                    </div>

                    {/* Version Info */}
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div>
                          {purchase.version ? (
                            <>
                              <div className="font-semibold">
                                Version {purchase.version.versionNumber} - {purchase.version.versionName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Published: {new Date(purchase.version.publishedAt).toLocaleDateString()}
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              Version details unavailable
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={() =>
                            purchase.version
                              ? handleDownload(purchase.id, purchase.version.id)
                              : undefined
                          }
                          disabled={!purchase.version}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => router.push(`/p/${purchase.product.slug}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Product
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
