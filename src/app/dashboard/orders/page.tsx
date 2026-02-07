'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/navigation/AppHeader';
import { useAuth } from '@/hooks/use-auth';
import { SellerSidebarNav } from '@/components/dashboard/seller/SellerSidebarNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ListOrdered } from 'lucide-react';

type SellerOrder = {
  id: string;
  createdAt: string;
  lineAmount: number;
  currency: string;
  product: {
    id: string;
    title: string;
    slug: string;
  };
  order: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    currency: string;
    createdAt: string;
    buyerId: string;
  };
};

interface OrdersResponse {
  orders: SellerOrder[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export default function DashboardOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading, isCreatorOrAdmin } = useAuth();
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (!isCreatorOrAdmin) {
      router.push('/dashboard/creator/onboarding');
      return;
    }

    const currentPage = Number.parseInt(searchParams.get('page') || '1', 10);
    const safePage = Number.isNaN(currentPage) || currentPage < 1 ? 1 : currentPage;
    setPage(safePage);
    void loadOrders(safePage);
  }, [authLoading, isAuthenticated, isCreatorOrAdmin, router, searchParams]);

  async function loadOrders(targetPage: number) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/orders?page=${targetPage}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || payload?.error || 'Failed to load orders');
      }

      const payload = (await response.json()) as OrdersResponse;
      setOrders(payload.orders || []);
      setTotalPages(payload.pagination?.totalPages || 1);
    } catch (loadError) {
      console.error('Failed to load seller orders:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }

  function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (status === 'COMPLETED') return 'default';
    if (status === 'PENDING') return 'secondary';
    if (status === 'CANCELLED') return 'destructive';
    return 'outline';
  }

  function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount || 0);
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading orders...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader contextLabel="Dashboard / Orders" browseLabel="Marketplace" browseHref="/" />

      <div className="container mx-auto px-4 py-8 space-y-6">
        <SellerSidebarNav />

        <div>
          <h1 className="text-3xl font-bold">Seller Orders</h1>
          <p className="text-muted-foreground">Review purchases for your listings.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" onClick={() => void loadOrders(page)}>
                  Retry
                </Button>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <ListOrdered className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-lg font-medium">No orders yet</p>
                <p className="text-sm text-muted-foreground">
                  Published listings will appear here after buyers complete checkout.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Listing</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Line Amount</TableHead>
                      <TableHead>Purchased</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.order.orderNumber}</TableCell>
                        <TableCell>{item.product.title}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(item.order.status)}>{item.order.status}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(item.lineAmount, item.currency)}</TableCell>
                        <TableCell>{new Date(item.order.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => router.push(`/dashboard/orders?page=${Math.max(1, page - 1)}`)}
                  >
                    Previous
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <Button
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => router.push(`/dashboard/orders?page=${Math.min(totalPages, page + 1)}`)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
