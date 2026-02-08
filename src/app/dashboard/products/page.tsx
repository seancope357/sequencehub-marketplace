'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  Eye,
  Download,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SellerSidebarNav } from '@/components/dashboard/seller/SellerSidebarNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  RequestTimeoutError,
  fetchWithTimeout,
  getApiErrorMessage,
} from '@/lib/network/fetch-with-timeout';

interface Product {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: string;
  price: number;
  includesFSEQ: boolean;
  includesSource: boolean;
  saleCount: number;
  viewCount: number;
  createdAt: string;
  media: {
    id: string;
    storageKey: string;
    mediaType: string;
    mimeType?: string | null;
    url?: string | null;
  }[];
}

type PageState = 'loading' | 'ready' | 'error';
type ProductsFetchResult =
  | { status: 'ok'; products: Product[] }
  | { status: 'unauthorized' }
  | { status: 'error'; message: string };

const PRODUCTS_REQUEST_TIMEOUT_MS = 12000;

function ProductTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={`product-row-skeleton-${index}`} className="h-12 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export default function DashboardProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    product: Product | null;
  }>({
    open: false,
    product: null,
  });

  const fetchProducts = async (): Promise<ProductsFetchResult> => {
    try {
      const response = await fetchWithTimeout(
        '/api/dashboard/products',
        {
          cache: 'no-store',
        },
        PRODUCTS_REQUEST_TIMEOUT_MS
      );

      if (response.status === 401 || response.status === 403) {
        return { status: 'unauthorized' };
      }

      if (!response.ok) {
        return {
          status: 'error',
          message: await getApiErrorMessage(response, 'Unable to load products right now.'),
        };
      }

      const payload = await response.json();
      return {
        status: 'ok',
        products: Array.isArray(payload?.products) ? payload.products : [],
      };
    } catch (error) {
      if (error instanceof RequestTimeoutError) {
        return {
          status: 'error',
          message:
            'Loading products took too long. Please retry. If this persists, check database connectivity.',
        };
      }

      return {
        status: 'error',
        message: 'Unable to load products right now. Please retry.',
      };
    }
  };

  const applyProductsResult = (result: ProductsFetchResult) => {
    if (result.status === 'unauthorized') {
      router.replace('/auth/login?next=%2Fdashboard%2Fproducts');
      return;
    }

    if (result.status === 'error') {
      setErrorMessage(result.message);
      setPageState('error');
      return;
    }

    setProducts(result.products);
    setErrorMessage('');
    setPageState('ready');
  };

  const refreshProducts = async () => {
    setIsRefreshing(true);
    setPageState('loading');
    setErrorMessage('');
    const result = await fetchProducts();
    applyProductsResult(result);
    setIsRefreshing(false);
  };

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      const result = await fetchProducts();
      if (!isMounted) {
        return;
      }
      applyProductsResult(result);
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeleteProduct = async (productId: string) => {
    try {
      const response = await fetchWithTimeout(
        `/api/dashboard/products/${productId}`,
        {
          method: 'DELETE',
        },
        PRODUCTS_REQUEST_TIMEOUT_MS
      );

      if (response.ok) {
        toast.success('Product deleted successfully');
        setDeleteDialog({ open: false, product: null });
        await refreshProducts();
        return;
      }

      const apiError = await getApiErrorMessage(response, 'Failed to delete product');
      toast.error(apiError);
    } catch (error) {
      if (error instanceof RequestTimeoutError) {
        toast.error('Delete request timed out. Please retry.');
      } else {
        toast.error('Failed to delete product');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge className="bg-green-500">Published</Badge>;
      case 'DRAFT':
        return <Badge variant="secondary">Draft</Badge>;
      case 'ARCHIVED':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader contextLabel="Dashboard / Products" browseLabel="Marketplace" browseHref="/" />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <SellerSidebarNav />
        </div>

        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">My Products</h1>
            <p className="text-muted-foreground">Manage your xLights sequences</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={refreshProducts}
              disabled={pageState === 'loading' || isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => router.push('/dashboard/products/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Product
            </Button>
          </div>
        </div>

        {pageState === 'loading' ? <ProductTableSkeleton /> : null}

        {pageState === 'error' ? (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load products</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{errorMessage}</p>
              <Button variant="secondary" onClick={refreshProducts}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {pageState === 'ready' ? (
          <Card>
            <CardHeader>
              <CardTitle>Products ({products.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="py-12 text-center">
                  <Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                  <h3 className="mb-2 text-xl font-semibold">No products yet</h3>
                  <p className="mb-4 text-muted-foreground">
                    Create your first listing to start selling.
                  </p>
                  <Button onClick={() => router.push('/dashboard/products/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Product
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Sales</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            <div>
                              {product.media?.length ? (
                                <div className="mb-2 grid grid-cols-4 gap-1">
                                  {product.media.slice(0, 4).map((item) => (
                                    <div
                                      key={item.id || item.storageKey}
                                      className="h-12 w-12 overflow-hidden rounded border bg-muted"
                                    >
                                      {item.url ? (
                                        item.mimeType?.startsWith('video/') ? (
                                          <video
                                            src={item.url}
                                            className="h-full w-full object-cover"
                                            muted
                                          />
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
                              ) : null}
                              <div className="flex items-center gap-2">
                                {product.includesFSEQ ? (
                                  <Badge variant="outline" className="text-xs">
                                    FSEQ
                                  </Badge>
                                ) : null}
                                {product.includesSource ? (
                                  <Badge variant="outline" className="text-xs">
                                    Source
                                  </Badge>
                                ) : null}
                              </div>
                              <div className="mt-1">{product.title}</div>
                            </div>
                          </TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell>{getStatusBadge(product.status)}</TableCell>
                          <TableCell>{formatCurrency(product.price)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              {product.saleCount}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {product.viewCount}
                            </div>
                          </TableCell>
                          <TableCell>{new Date(product.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/p/${product.slug}`)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(`/dashboard/products/${product.id}/edit`)
                                  }
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeleteDialog({ open: true, product })}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.product?.title}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() =>
                deleteDialog.product ? handleDeleteProduct(deleteDialog.product.id) : undefined
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
