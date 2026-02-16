import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getRequestMetadata } from '@/lib/admin/auth';
import { db } from '@/lib/db';
import { AuditAction, Role } from '@prisma/client';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().optional(),
  emailVerified: z.boolean().optional(),
  roles: z.array(z.nativeEnum(Role)).optional(),
  onboardingCompleted: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    await requireAdmin(request);

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      include: {
        roles: true,
        profile: true,
        creatorAccount: true,
        _count: {
          select: {
            products: true,
            orders: true,
            reviews: true,
            entitlements: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Remove password hash from response
    const { passwordHash, ...sanitizedUser } = user;

    return NextResponse.json({
      success: true,
      data: {
        ...sanitizedUser,
        roles: user.roles.map((r) => r.role),
        stats: {
          products: user._count.products,
          orders: user._count.orders,
          reviews: user._count.reviews,
          entitlements: user._count.entitlements,
        },
      },
    });
  } catch (error) {
    console.error('Admin get user error:', error);

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
    const validatedData = updateUserSchema.parse(body);

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id },
      include: { roles: true },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent admins from removing their own admin role
    if (id === admin.id && validatedData.roles && !validatedData.roles.includes(Role.ADMIN)) {
      return NextResponse.json(
        { error: 'Cannot remove your own admin role' },
        { status: 400 }
      );
    }

    // Update user
    const updateData: any = {
      name: validatedData.name,
      emailVerified: validatedData.emailVerified,
      onboardingCompleted: validatedData.onboardingCompleted,
    };

    // Handle role updates
    if (validatedData.roles) {
      const currentRoles = existingUser.roles.map((r) => r.role);
      const rolesToAdd = validatedData.roles.filter((r) => !currentRoles.includes(r));
      const rolesToRemove = currentRoles.filter((r) => !validatedData.roles!.includes(r));

      // Add new roles
      for (const role of rolesToAdd) {
        await db.userRole.create({
          data: {
            userId: id,
            role,
          },
        });
      }

      // Remove roles
      for (const role of rolesToRemove) {
        await db.userRole.deleteMany({
          where: {
            userId: id,
            role,
          },
        });
      }
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      include: {
        roles: true,
        profile: true,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: AuditAction.USER_UPDATED,
        entityType: 'user',
        entityId: id,
        changes: JSON.stringify(validatedData),
        ipAddress,
        userAgent,
      },
    });

    // Remove password hash from response
    const { passwordHash, ...sanitizedUser } = updatedUser;

    return NextResponse.json({
      success: true,
      data: {
        ...sanitizedUser,
        roles: updatedUser.roles.map((r) => r.role),
      },
    });
  } catch (error) {
    console.error('Admin update user error:', error);

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

    // Prevent admins from deleting themselves
    if (id === admin.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete user (cascades to related records)
    await db.user.delete({
      where: { id },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: AuditAction.USER_DELETED,
        entityType: 'user',
        entityId: id,
        metadata: JSON.stringify({ deletedEmail: user.email }),
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Admin delete user error:', error);

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
