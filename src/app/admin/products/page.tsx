'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Trash2, CheckCircle, XCircle, ChevronLeft, ChevronRight, Archive } from 'lucide-react';
import { ProductStatus } from '@prisma/client';
import { toast } from 'sonner';

interface Product {
  id: string;
  title: string;
  slug: string;
  status: ProductStatus;
  category: string;
  price: number;
  saleCount: number;
  viewCount: number;
  createdAt: string;
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
  stats: {
    versions: number;
    reviews: number;
    sales: number;
  };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [page, statusFilter]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/admin/products?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.data);
        setTotalPages(data.pagination.totalPages);
      } else {
        toast.error('Failed to load products');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Error loading products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadProducts();
  };

  const handleUpdateStatus = async (productId: string, newStatus: ProductStatus) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success(`Product ${newStatus.toLowerCase()} successfully`);
        loadProducts();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Error updating product');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/products/${selectedProduct.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Product deleted successfully');
        setIsDeleteDialogOpen(false);
        loadProducts();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error deleting product');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: ProductStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case ProductStatus.PUBLISHED:
        return 'default';
      case ProductStatus.DRAFT:
        return 'secondary';
      case ProductStatus.ARCHIVED:
        return 'outline';
      case ProductStatus.SUSPENDED:
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Product Moderation</h1>
        <p className="text-muted-foreground">Manage and moderate platform products</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value={ProductStatus.PUBLISHED}>Published</SelectItem>
                <SelectItem value={ProductStatus.DRAFT}>Draft</SelectItem>
                <SelectItem value={ProductStatus.ARCHIVED}>Archived</SelectItem>
                <SelectItem value={ProductStatus.SUSPENDED}>Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No products found</div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {product.stats.versions}V / {product.stats.reviews}R / {product.viewCount} views
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{product.creator.name || 'Unnamed'}</div>
                            <div className="text-xs text-muted-foreground">{product.creator.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(product.status)} className="text-xs">
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(product.price)}</TableCell>
                        <TableCell>{product.stats.sales}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(product.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {product.status !== ProductStatus.PUBLISHED && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdateStatus(product.id, ProductStatus.PUBLISHED)}
                                disabled={actionLoading}
                                title="Publish"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {product.status !== ProductStatus.SUSPENDED && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdateStatus(product.id, ProductStatus.SUSPENDED)}
                                disabled={actionLoading}
                                title="Suspend"
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                            {product.status !== ProductStatus.ARCHIVED && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdateStatus(product.id, ProductStatus.ARCHIVED)}
                                disabled={actionLoading}
                                title="Archive"
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(product)}
                              disabled={actionLoading}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedProduct?.title}? This action cannot be undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={actionLoading}>
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
