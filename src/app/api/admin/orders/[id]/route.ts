import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getRequestMetadata } from '@/lib/admin/auth';
import { db } from '@/lib/db';
import { AuditAction, OrderStatus } from '@prisma/client';
import { z } from 'zod';

const updateOrderSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  refundAmount: z.number().min(0).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    await requireAdmin(request);

    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                creator: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        entitlements: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Admin get order error:', error);

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const admin = await requireAdmin(request);
    const { ipAddress, userAgent } = getRequestMetadata(request);

    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = updateOrderSchema.parse(body);

    // Check if order exists
    const existingOrder = await db.order.findUnique({
      where: { id },
      include: {
        entitlements: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Handle refund
    if (validatedData.status === OrderStatus.REFUNDED && validatedData.refundAmount) {
      // Update order
      const updatedOrder = await db.order.update({
        where: { id },
        data: {
          status: OrderStatus.REFUNDED,
          refundedAmount: validatedData.refundAmount,
          refundedAt: new Date(),
        },
      });

      // Deactivate entitlements
      await db.entitlement.updateMany({
        where: { orderId: id },
        data: { isActive: false },
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: admin.id,
          orderId: id,
          action: AuditAction.ORDER_REFUNDED,
          entityType: 'order',
          entityId: id,
          changes: JSON.stringify({ refundAmount: validatedData.refundAmount }),
          metadata: JSON.stringify({
            orderNumber: updatedOrder.orderNumber,
            totalAmount: updatedOrder.totalAmount,
          }),
          ipAddress,
          userAgent,
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedOrder,
      });
    }

    // Handle other status updates
    const updatedOrder = await db.order.update({
      where: { id },
      data: {
        status: validatedData.status,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: admin.id,
        orderId: id,
        action: AuditAction.ORDER_UPDATED,
        entityType: 'order',
        entityId: id,
        changes: JSON.stringify(validatedData),
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
    });
  } catch (error) {
    console.error('Admin update order error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

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
