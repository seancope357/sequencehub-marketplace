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
import { Search, RefreshCw, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { OrderStatus } from '@prisma/client';
import { toast } from 'sonner';

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  refundedAmount: number;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  itemCount: number;
  products: Array<{
    id: string;
    title: string;
    price: number;
  }>;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/admin/orders?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.data);
        setTotalPages(data.pagination.totalPages);
      } else {
        toast.error('Failed to load orders');
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Error loading orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadOrders();
  };

  const handleRefund = (order: Order) => {
    setSelectedOrder(order);
    setRefundAmount(order.totalAmount.toString());
    setIsRefundDialogOpen(true);
  };

  const handleConfirmRefund = async () => {
    if (!selectedOrder) return;

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedOrder.totalAmount) {
      toast.error('Invalid refund amount');
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: OrderStatus.REFUNDED,
          refundAmount: amount,
        }),
      });

      if (response.ok) {
        toast.success('Order refunded successfully');
        setIsRefundDialogOpen(false);
        loadOrders();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to refund order');
      }
    } catch (error) {
      console.error('Error refunding order:', error);
      toast.error('Error refunding order');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: OrderStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case OrderStatus.COMPLETED:
        return 'default';
      case OrderStatus.PENDING:
        return 'secondary';
      case OrderStatus.REFUNDED:
        return 'destructive';
      case OrderStatus.CANCELLED:
        return 'outline';
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
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Order Management</h1>
        <p className="text-muted-foreground">View and manage platform orders</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search by order number or email..."
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
                <SelectItem value={OrderStatus.COMPLETED}>Completed</SelectItem>
                <SelectItem value={OrderStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={OrderStatus.REFUNDED}>Refunded</SelectItem>
                <SelectItem value={OrderStatus.CANCELLED}>Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No orders found</div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="font-medium">{order.orderNumber}</div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{order.user.name || 'Unnamed'}</div>
                            <div className="text-xs text-muted-foreground">{order.user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {order.products.slice(0, 2).map((product, idx) => (
                              <div key={idx} className="text-muted-foreground">
                                {product.title}
                              </div>
                            ))}
                            {order.products.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{order.products.length - 2} more
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{formatCurrency(order.totalAmount)}</div>
                            {order.refundedAmount > 0 && (
                              <div className="text-xs text-red-600">
                                Refunded: {formatCurrency(order.refundedAmount)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(order.status)} className="text-xs">
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {order.status === OrderStatus.COMPLETED && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRefund(order)}
                                disabled={actionLoading}
                                title="Refund"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
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

      {/* Refund Dialog */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund Order</DialogTitle>
            <DialogDescription>
              Process refund for order {selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Refund Amount</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={selectedOrder?.totalAmount}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="Enter refund amount"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum: {formatCurrency(selectedOrder?.totalAmount || 0)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmRefund} disabled={actionLoading}>
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
