import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/auth';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Apply rate limiting: 20 deletions per hour per user
    const limitResult = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.DELETE_FILE,
      byUser: true,
      byIp: false,
      message: 'Too many deletion requests. Please try again later.',
    });

    if (!limitResult.allowed) {
      return limitResult.response;
    }

    const { id } = params;

    // Check if product belongs to user
    const product = await db.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (product.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete product (cascade will handle related records)
    await db.product.delete({
      where: { id },
    });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'PRODUCT_DELETED',
      entityType: 'product',
      entityId: product.id,
      changes: JSON.stringify({ title: product.title }),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      { message: 'Product deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
