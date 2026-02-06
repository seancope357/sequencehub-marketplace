import Link from 'next/link';
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
import { AuditAction } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams?: { action?: string; user?: string; entity?: string };
}) {
  const actionParam = searchParams?.action?.trim();
  const userParam = searchParams?.user?.trim();
  const entityParam = searchParams?.entity?.trim();

  const where: Parameters<typeof db.auditLog.findMany>[0]['where'] = {};

  if (actionParam && actionParam !== 'ALL') {
    where.action = actionParam as AuditAction;
  }

  if (userParam) {
    where.user = {
      OR: [
        { email: { contains: userParam, mode: 'insensitive' } },
        { name: { contains: userParam, mode: 'insensitive' } },
      ],
    };
  }

  if (entityParam) {
    where.entityType = entityParam;
  }

  const logs = await db.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    where,
    include: {
      user: { select: { name: true, email: true } },
      order: { select: { orderNumber: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">Search recent audit events across the platform.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4">
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Action</span>
              <select
                name="action"
                defaultValue={actionParam || 'ALL'}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="ALL">All actions</option>
                {Object.values(AuditAction).map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">User (name or email)</span>
              <input
                name="user"
                defaultValue={userParam || ''}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Entity Type</span>
              <input
                name="entity"
                defaultValue={entityParam || ''}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Apply
              </button>
              <Link
                href="/admin/audit"
                className="h-10 rounded-md border px-4 text-sm font-medium text-foreground flex items-center"
              >
                Clear
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit logs found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>{log.user?.name || log.user?.email || 'System'}</TableCell>
                    <TableCell>{log.entityType || 'n/a'}</TableCell>
                    <TableCell>{log.order?.orderNumber || 'n/a'}</TableCell>
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
