import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getRequestMetadata } from '@/lib/admin/auth';
import { db } from '@/lib/db';
import { AuditAction, ProductStatus } from '@prisma/client';
import { z } from 'zod';

const updateProductSchema = z.object({
  status: z.nativeEnum(ProductStatus).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});

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
    const validatedData = updateProductSchema.parse(body);

    // Check if product exists
    const existingProduct = await db.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Update product
    const updatedProduct = await db.product.update({
      where: { id },
      data: validatedData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        prices: {
          where: { isActive: true },
        },
      },
    });

    // Create audit log
    const auditAction = validatedData.status === ProductStatus.PUBLISHED
      ? AuditAction.PRODUCT_PUBLISHED
      : validatedData.status === ProductStatus.ARCHIVED
      ? AuditAction.PRODUCT_ARCHIVED
      : AuditAction.PRODUCT_UPDATED;

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: auditAction,
        entityType: 'product',
        entityId: id,
        changes: JSON.stringify(validatedData),
        metadata: JSON.stringify({
          productTitle: updatedProduct.title,
          creatorId: updatedProduct.creatorId,
        }),
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedProduct,
    });
  } catch (error) {
    console.error('Admin update product error:', error);

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const admin = await requireAdmin(request);
    const { ipAddress, userAgent } = getRequestMetadata(request);

    const { id } = await params;

    // Check if product exists
    const product = await db.product.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        creatorId: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Delete product (cascades to related records)
    await db.product.delete({
      where: { id },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: AuditAction.PRODUCT_DELETED,
        entityType: 'product',
        entityId: id,
        metadata: JSON.stringify({
          productTitle: product.title,
          creatorId: product.creatorId,
        }),
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Admin delete product error:', error);

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
