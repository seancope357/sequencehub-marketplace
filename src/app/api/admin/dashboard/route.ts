import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { db } from '@/lib/db';
import { Role, ProductStatus, OrderStatus, AuditAction } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin(request);

    // Get user counts by role
    const [
      totalUsers,
      buyers,
      creators,
      admins,
    ] = await Promise.all([
      db.user.count(),
      db.userRole.count({ where: { role: Role.BUYER } }),
      db.userRole.count({ where: { role: Role.CREATOR } }),
      db.userRole.count({ where: { role: Role.ADMIN } }),
    ]);

    // Get product counts by status
    const [
      totalProducts,
      publishedProducts,
      draftProducts,
      archivedProducts,
    ] = await Promise.all([
      db.product.count(),
      db.product.count({ where: { status: ProductStatus.PUBLISHED } }),
      db.product.count({ where: { status: ProductStatus.DRAFT } }),
      db.product.count({ where: { status: ProductStatus.ARCHIVED } }),
    ]);

    // Get order counts by status
    const [
      totalOrders,
      completedOrders,
      refundedOrders,
      pendingOrders,
    ] = await Promise.all([
      db.order.count(),
      db.order.count({ where: { status: OrderStatus.COMPLETED } }),
      db.order.count({ where: { status: OrderStatus.REFUNDED } }),
      db.order.count({ where: { status: OrderStatus.PENDING } }),
    ]);

    // Calculate revenue
    const orders = await db.order.findMany({
      where: {
        status: {
          in: [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED],
        },
      },
      select: {
        totalAmount: true,
        refundedAmount: true,
      },
    });

    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalRefunded = orders.reduce((sum, order) => sum + order.refundedAmount, 0);
    const netRevenue = totalSales - totalRefunded;

    // Platform fee is typically 10% - adjust based on your settings
    const platformFeePercent = 10;
    const platformFees = netRevenue * (platformFeePercent / 100);
    const creatorEarnings = netRevenue - platformFees;

    // Get recent activity from audit log
    const recentActivity = await db.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      where: {
        action: {
          in: [
            AuditAction.USER_CREATED,
            AuditAction.PRODUCT_CREATED,
            AuditAction.PRODUCT_PUBLISHED,
            AuditAction.ORDER_CREATED,
            AuditAction.ORDER_REFUNDED,
            AuditAction.PRODUCT_DELETED,
            AuditAction.USER_DELETED,
          ],
        },
      },
    });

    const stats = {
      users: {
        total: totalUsers,
        buyers,
        creators,
        admins,
      },
      products: {
        total: totalProducts,
        published: publishedProducts,
        draft: draftProducts,
        archived: archivedProducts,
      },
      orders: {
        total: totalOrders,
        completed: completedOrders,
        refunded: refundedOrders,
        pending: pendingOrders,
      },
      revenue: {
        totalSales: netRevenue,
        platformFees,
        creatorEarnings,
      },
    };

    const formattedActivity = recentActivity.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType || 'unknown',
      entityId: log.entityId || '',
      userName: log.user?.name || log.user?.email || 'Unknown User',
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      stats,
      recentActivity: formattedActivity,
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
