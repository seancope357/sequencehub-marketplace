import { db } from '@/lib/db';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export default async function AdminDashboardPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    userCount,
    creatorCount,
    productCount,
    orderCount,
    revenueAgg,
    recentAuditLogs,
    recentRevenueAgg,
    recentOrderCount,
    activeCreators,
    topProducts,
  ] = await Promise.all([
    db.user.count(),
    db.userRole.count({ where: { role: 'CREATOR' } }),
    db.product.count(),
    db.order.count(),
    db.order.aggregate({ _sum: { totalAmount: true }, where: { status: 'COMPLETED' } }),
    db.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    db.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } },
    }),
    db.order.count({
      where: { status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } },
    }),
    db.product.findMany({
      where: { status: 'PUBLISHED' },
      distinct: ['creatorId'],
      select: { creatorId: true },
    }),
    db.product.findMany({
      take: 5,
      orderBy: { saleCount: 'desc' },
      include: {
        creator: { select: { name: true, email: true } },
        prices: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    }),
  ]);

  const totalRevenue = revenueAgg._sum.totalAmount ?? 0;
  const recentRevenue = recentRevenueAgg._sum.totalAmount ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and recent activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
            <div className="text-sm text-muted-foreground">{creatorCount} creators</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productCount}</div>
            <Link href="/admin/products" className="text-sm text-primary underline underline-offset-4">
              View products
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderCount}</div>
            <Link href="/admin/orders" className="text-sm text-primary underline underline-offset-4">
              Review orders
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <div className="text-sm text-muted-foreground">Completed orders total</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Revenue (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(recentRevenue)}</div>
            <div className="text-sm text-muted-foreground">{recentOrderCount} completed orders</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Creators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCreators.length}</div>
            <div className="text-sm text-muted-foreground">Creators with published products</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAuditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit activity yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAuditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>
                      {log.user?.name || log.user?.email || 'System'}
                    </TableCell>
                    <TableCell>
                      {log.entityType || 'n/a'}
                    </TableCell>
                    <TableCell>
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products available.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Current Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.title}</TableCell>
                    <TableCell>
                      {product.creator?.name || product.creator?.email || 'Unknown'}
                    </TableCell>
                    <TableCell>{product.saleCount}</TableCell>
                    <TableCell>
                      {formatCurrency(product.prices[0]?.amount || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
