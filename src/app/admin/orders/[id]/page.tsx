import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminOrderRefundActions } from '@/components/admin/AdminOrderRefundActions';

export const dynamic = 'force-dynamic';

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const order = await db.order.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          product: { select: { id: true, title: true } },
        },
      },
      entitlements: true,
    },
  });

  if (!order) {
    notFound();
  }

  const refundable =
    Boolean(order.paymentIntentId) &&
    order.status !== 'REFUNDED' &&
    order.status !== 'CANCELLED';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Order {order.orderNumber}</h1>
        <p className="text-muted-foreground">Order details and refund controls.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm text-muted-foreground">Buyer</div>
            <div className="font-medium">{order.user?.name || order.user?.email || 'Unknown'}</div>
            <div className="text-sm text-muted-foreground">{order.user?.email}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="font-medium">{order.status}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="font-medium">{formatCurrency(order.totalAmount, order.currency)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Refunded</div>
            <div className="font-medium">{formatCurrency(order.refundedAmount, order.currency)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Created</div>
            <div className="font-medium">{new Date(order.createdAt).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Refunded At</div>
            <div className="font-medium">
              {order.refundedAt ? new Date(order.refundedAt).toLocaleString() : '—'}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Payment Intent</div>
            <div className="font-mono text-sm break-all">{order.paymentIntentId || '—'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Entitlements</div>
            <div className="font-medium">
              {order.entitlements.length} total •{' '}
              {order.entitlements.filter((ent) => ent.isActive).length} active
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          {order.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No order items found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Currency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product?.title || 'Unknown'}</TableCell>
                    <TableCell>{formatCurrency(item.priceAtPurchase, item.currency)}</TableCell>
                    <TableCell>{item.currency}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Refund</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Issue a full refund using Stripe and deactivate entitlements.
          </div>
          <AdminOrderRefundActions
            orderId={order.id}
            isRefundable={refundable}
            status={order.status}
          />
        </CardContent>
      </Card>
    </div>
  );
}
