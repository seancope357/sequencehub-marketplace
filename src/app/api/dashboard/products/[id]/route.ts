import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createAuditLog } from '@/lib/auth';
import { isCreatorOrAdmin, isAdmin } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Require CREATOR or ADMIN role
    if (!isCreatorOrAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - CREATOR role required to view product details' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Fetch product with all details
    const product = await db.product.findUnique({
      where: { id },
      include: {
        prices: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        versions: {
          where: { isLatest: true },
          include: {
            files: true,
          },
        },
        media: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (product.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You do not own this product' },
        { status: 403 }
      );
    }

    // Transform data for the frontend
    const transformedProduct = {
      id: product.id,
      slug: product.slug,
      title: product.title,
      description: product.description,
      category: product.category,
      status: product.status,
      price: product.prices[0]?.amount || 0,
      includesFSEQ: product.includesFSEQ,
      includesSource: product.includesSource,
      licenseType: product.licenseType,
      seatCount: product.seatCount,
      xLightsVersionMin: product.xLightsVersionMin,
      xLightsVersionMax: product.xLightsVersionMax,
      targetUse: product.targetUse,
      expectedProps: product.expectedProps,
      saleCount: product.saleCount,
      viewCount: product.viewCount,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      files: product.versions[0]?.files || [],
      media: product.media,
    };

    return NextResponse.json(
      { product: transformedProduct },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching product:', error);
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
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Require CREATOR or ADMIN role
    if (!isCreatorOrAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - CREATOR role required to update products' },
        { status: 403 }
      );
    }

    // Apply rate limiting: 20 updates per hour per user
    const limitResult = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.PRODUCT_UPDATE,
      byUser: true,
      byIp: false,
      message: 'Too many update requests. Please try again later.',
    });

    if (!limitResult.allowed) {
      return limitResult.response;
    }

    const { id } = await params;

    // Check if product exists and belongs to user
    const existingProduct = await db.product.findUnique({
      where: { id },
      include: {
        prices: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Verify ownership (creator owns the product OR user is ADMIN)
    if (existingProduct.creatorId !== user.id && !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to edit this product' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      price,
      xLightsVersionMin,
      xLightsVersionMax,
      targetUse,
      expectedProps,
      includesFSEQ,
      includesSource,
      licenseType,
      seatCount,
      status,
    } = body;

    // Validation
    if (title !== undefined && !title?.trim()) {
      return NextResponse.json(
        { error: 'Title cannot be empty' },
        { status: 400 }
      );
    }

    if (description !== undefined && !description?.trim()) {
      return NextResponse.json(
        { error: 'Description cannot be empty' },
        { status: 400 }
      );
    }

    if (category !== undefined && !category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    if (price !== undefined && (price === null || price < 0)) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      );
    }

    // Track changes for audit log
    const changes: Record<string, any> = {};

    // Build update data object
    const updateData: any = {};

    // Handle title change and slug regeneration
    if (title !== undefined && title !== existingProduct.title) {
      // Generate new slug from title
      const baseSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 100);

      // Check for duplicate slug (excluding current product)
      const duplicateSlug = await db.product.findFirst({
        where: {
          slug: baseSlug,
          id: { not: id },
        },
      });

      const finalSlug = duplicateSlug
        ? `${baseSlug}-${Date.now()}`
        : baseSlug;

      updateData.title = title;
      updateData.slug = finalSlug;
      changes.title = { old: existingProduct.title, new: title };
      if (finalSlug !== existingProduct.slug) {
        changes.slug = { old: existingProduct.slug, new: finalSlug };
      }
    }

    // Handle other field updates
    if (description !== undefined && description !== existingProduct.description) {
      updateData.description = description;
      changes.description = { old: existingProduct.description, new: description };
    }

    if (category !== undefined && category !== existingProduct.category) {
      updateData.category = category;
      changes.category = { old: existingProduct.category, new: category };
    }

    if (status !== undefined && status !== existingProduct.status) {
      updateData.status = status;
      changes.status = { old: existingProduct.status, new: status };
    }

    if (licenseType !== undefined && licenseType !== existingProduct.licenseType) {
      updateData.licenseType = licenseType;
      changes.licenseType = { old: existingProduct.licenseType, new: licenseType };
    }

    if (seatCount !== undefined && seatCount !== existingProduct.seatCount) {
      updateData.seatCount = licenseType === 'COMMERCIAL' ? seatCount : null;
      changes.seatCount = { old: existingProduct.seatCount, new: updateData.seatCount };
    }

    if (includesFSEQ !== undefined && includesFSEQ !== existingProduct.includesFSEQ) {
      updateData.includesFSEQ = includesFSEQ;
      changes.includesFSEQ = { old: existingProduct.includesFSEQ, new: includesFSEQ };
    }

    if (includesSource !== undefined && includesSource !== existingProduct.includesSource) {
      updateData.includesSource = includesSource;
      changes.includesSource = { old: existingProduct.includesSource, new: includesSource };
    }

    if (xLightsVersionMin !== undefined && xLightsVersionMin !== existingProduct.xLightsVersionMin) {
      updateData.xLightsVersionMin = xLightsVersionMin;
      changes.xLightsVersionMin = { old: existingProduct.xLightsVersionMin, new: xLightsVersionMin };
    }

    if (xLightsVersionMax !== undefined && xLightsVersionMax !== existingProduct.xLightsVersionMax) {
      updateData.xLightsVersionMax = xLightsVersionMax;
      changes.xLightsVersionMax = { old: existingProduct.xLightsVersionMax, new: xLightsVersionMax };
    }

    if (targetUse !== undefined && targetUse !== existingProduct.targetUse) {
      updateData.targetUse = targetUse;
      changes.targetUse = { old: existingProduct.targetUse, new: targetUse };
    }

    if (expectedProps !== undefined && expectedProps !== existingProduct.expectedProps) {
      updateData.expectedProps = expectedProps;
      changes.expectedProps = { old: existingProduct.expectedProps, new: expectedProps };
    }

    // Update product if there are changes
    let updatedProduct;
    if (Object.keys(updateData).length > 0) {
      updatedProduct = await db.product.update({
        where: { id },
        data: updateData,
        include: {
          prices: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
    } else {
      // No product field changes, but may have price change
      updatedProduct = existingProduct;
    }

    // Update price if provided and different
    let priceUpdated = false;
    if (price !== undefined && price !== existingProduct.prices[0]?.amount) {
      // Deactivate all old prices
      await db.price.updateMany({
        where: {
          productId: id,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // Create new active price
      await db.price.create({
        data: {
          productId: id,
          amount: parseFloat(price.toString()),
          currency: 'USD',
          isActive: true,
        },
      });

      changes.price = { old: existingProduct.prices[0]?.amount || 0, new: price };
      priceUpdated = true;

      // Refetch product with new price if we didn't update other fields
      if (Object.keys(updateData).length === 0) {
        updatedProduct = await db.product.findUnique({
          where: { id },
          include: {
            prices: {
              where: { isActive: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        });
      }
    }

    // Check if any changes were made
    if (Object.keys(changes).length === 0) {
      return NextResponse.json(
        { error: 'No changes provided' },
        { status: 400 }
      );
    }

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'PRODUCT_UPDATED',
      entityType: 'product',
      entityId: id,
      changes: JSON.stringify(changes),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Fetch complete product data for response
    const completeProduct = await db.product.findUnique({
      where: { id },
      include: {
        prices: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json(
      {
        product: {
          id: completeProduct!.id,
          slug: completeProduct!.slug,
          title: completeProduct!.title,
          description: completeProduct!.description,
          category: completeProduct!.category,
          status: completeProduct!.status,
          price: completeProduct!.prices[0]?.amount || 0,
          xLightsVersionMin: completeProduct!.xLightsVersionMin,
          xLightsVersionMax: completeProduct!.xLightsVersionMax,
          targetUse: completeProduct!.targetUse,
          expectedProps: completeProduct!.expectedProps,
          includesFSEQ: completeProduct!.includesFSEQ,
          includesSource: completeProduct!.includesSource,
          licenseType: completeProduct!.licenseType,
          seatCount: completeProduct!.seatCount,
          updatedAt: completeProduct!.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating product:', error);
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
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Require CREATOR or ADMIN role
    if (!isCreatorOrAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - CREATOR role required to delete products' },
        { status: 403 }
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

    const { id } = await params;

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
