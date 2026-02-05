import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { isAdmin } from '@/lib/auth-utils';
import { db } from '@/lib/db';

const VALID_ROLES = new Set(['ADMIN', 'CREATOR', 'BUYER']);

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(currentUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const role = body?.role as string | undefined;
    if (!role || !VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    if (role === 'BUYER') {
      return NextResponse.json({ error: 'BUYER role is implicit for all users' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: params.userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db.userRole.upsert({
      where: { userId_role: { userId: params.userId, role } },
      update: {},
      create: { userId: params.userId, role },
    });

    await db.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'ADMIN_ACTION',
        entityType: 'user',
        entityId: params.userId,
        metadata: {
          action: 'role_added',
          role,
          actorId: currentUser.id,
        },
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Admin role add error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(currentUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const role = body?.role as string | undefined;
    if (!role || !VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    if (role === 'BUYER') {
      return NextResponse.json({ error: 'BUYER role is implicit for all users' }, { status: 400 });
    }

    if (currentUser.id === params.userId && role === 'ADMIN') {
      return NextResponse.json({ error: 'You cannot remove your own admin role.' }, { status: 400 });
    }

    await db.userRole.delete({
      where: { userId_role: { userId: params.userId, role } },
    });

    await db.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'ADMIN_ACTION',
        entityType: 'user',
        entityId: params.userId,
        metadata: {
          action: 'role_removed',
          role,
          actorId: currentUser.id,
        },
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Admin role remove error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
