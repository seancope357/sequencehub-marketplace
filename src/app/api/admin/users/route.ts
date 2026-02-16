import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getRequestMetadata } from '@/lib/admin/auth';
import { db } from '@/lib/db';
import { AuditAction } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.roles = {
        some: {
          role: role,
        },
      };
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          roles: true,
          profile: true,
          _count: {
            select: {
              products: true,
              orders: true,
              reviews: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    // Remove password hashes from response
    const sanitizedUsers = users.map(({ passwordHash, ...user }) => ({
      ...user,
      roles: user.roles.map((r) => r.role),
      stats: {
        products: user._count.products,
        orders: user._count.orders,
        reviews: user._count.reviews,
      },
    }));

    return NextResponse.json({
      success: true,
      data: sanitizedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin users list error:', error);

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
