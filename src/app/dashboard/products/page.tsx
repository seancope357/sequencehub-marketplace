'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Eye,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SellerSidebarNav } from '@/components/dashboard/seller/SellerSidebarNav';

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
}

export default function DashboardProducts() {
  const router = useRouter();
  const { user, isAuthenticated, isCreatorOrAdmin, isLoading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Require CREATOR or ADMIN role
    if (!isCreatorOrAdmin) {
      router.push('/dashboard/creator/onboarding');
      return;
    }

    loadProducts();
  }, [isAuthenticated, isCreatorOrAdmin, authLoading, router]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/dashboard/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/dashboard/products/${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Product deleted successfully');
        // Remove product from list immediately for better UX
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        setDeleteDialog({ open: false, product: null });
      } else {
        // Parse error message from response
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to delete product';

        // Handle specific error cases
        if (response.status === 403 && errorMessage.includes('orders')) {
          toast.error('Cannot delete product with existing orders. Please archive it instead.');
        } else if (response.status === 404) {
          toast.error('Product not found or already deleted');
          // Remove from list since it doesn't exist
          setProducts((prev) => prev.filter((p) => p.id !== productId));
          setDeleteDialog({ open: false, product: null });
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsDeleting(false);
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
      <AppHeader contextLabel="Products" />

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Products</h1>
              <p className="text-muted-foreground">Manage your xLights sequences</p>
            </div>
            <Button onClick={() => router.push('/dashboard/products/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Product
            </Button>
          </div>
          <SellerSidebarNav />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Products ({products.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No products yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by creating your first product
                </p>
                <Button onClick={() => router.push('/dashboard/products/new')}>
                  <Plus className="h-4 w-4 mr-2" />
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
                            <div className="flex items-center gap-2">
                              {product.includesFSEQ && (
                                <Badge variant="outline" className="text-xs">
                                  FSEQ
                                </Badge>
                              )}
                              {product.includesSource && (
                                <Badge variant="outline" className="text-xs">
                                  Source
                                </Badge>
                              )}
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
                        <TableCell>
                          {new Date(product.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  (router.push(`/p/${product.slug}`))
                                }
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/products/${product.id}/edit`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  setDeleteDialog({ open: true, product })
                                }
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
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
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setDeleteDialog({ ...deleteDialog, open });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will permanently delete <strong>{deleteDialog.product?.title}</strong> and
                all associated files.
              </p>
              <p className="text-destructive font-medium">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() =>
                deleteDialog.product && handleDeleteProduct(deleteDialog.product.id)
              }
            >
              {isDeleting ? 'Deleting...' : 'Delete Product'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
