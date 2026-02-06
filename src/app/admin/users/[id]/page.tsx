import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/supabase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminUserRoleActions } from '@/components/admin/AdminUserRoleActions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const [currentUser, user, productCount, orderCount, entitlementCount, auditLogs] =
    await Promise.all([
      getCurrentUser(),
      db.user.findUnique({
        where: { id: params.id },
        include: {
          roles: true,
          profile: true,
          creatorAccount: true,
        },
      }),
      db.product.count({ where: { creatorId: params.id } }),
      db.order.count({ where: { userId: params.id } }),
      db.entitlement.count({ where: { userId: params.id } }),
      db.auditLog.findMany({
        where: { userId: params.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

  if (!user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{user.name || user.email}</h1>
        <p className="text-muted-foreground">User profile and activity details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm text-muted-foreground">Email</div>
            <div className="font-medium">{user.email}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">User ID</div>
            <div className="font-mono text-sm break-all">{user.id}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Joined</div>
            <div className="font-medium">{new Date(user.createdAt).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Last Updated</div>
            <div className="font-medium">{new Date(user.updatedAt).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Roles</div>
            <div className="font-medium">
              {user.roles.length === 0 ? 'BUYER' : user.roles.map((r) => r.role).join(', ')}
            </div>
          </div>
          <div className="flex items-end justify-end">
            <AdminUserRoleActions
              userId={user.id}
              roles={user.roles.map((role) => role.role as 'ADMIN' | 'CREATOR' | 'BUYER')}
              isSelf={currentUser?.id === user.id}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-sm text-muted-foreground">Products Created</div>
            <div className="text-2xl font-bold">{productCount}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Orders Placed</div>
            <div className="text-2xl font-bold">{orderCount}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Entitlements</div>
            <div className="text-2xl font-bold">{entitlementCount}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Creator Account</CardTitle>
        </CardHeader>
        <CardContent>
          {user.creatorAccount ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Stripe Account ID</div>
                <div className="font-mono text-sm break-all">{user.creatorAccount.stripeAccountId || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Onboarding Status</div>
                <div className="font-medium">{user.creatorAccount.onboardingStatus}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Stripe Status</div>
                <div className="font-medium">{user.creatorAccount.stripeAccountStatus || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Platform Fee</div>
                <div className="font-medium">{user.creatorAccount.platformFeePercent}%</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No creator account on file.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events for this user.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>{log.entityType || 'n/a'}</TableCell>
                    <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
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
