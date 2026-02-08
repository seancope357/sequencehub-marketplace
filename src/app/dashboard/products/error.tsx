'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SellerSidebarNav } from '@/components/dashboard/seller/SellerSidebarNav';

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard products route error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader contextLabel="Dashboard / Products" browseLabel="Marketplace" browseHref="/" />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <SellerSidebarNav />
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              We could not load your products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Something failed while rendering this page. Retry now. If this continues, verify your
              connection and server logs.
            </p>
            <Button onClick={reset}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

