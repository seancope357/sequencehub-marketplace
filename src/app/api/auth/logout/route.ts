import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, clearAuthCookie, createAuditLog } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (user) {
      // Create audit log
      await createAuditLog({
        userId: user.id,
        action: 'USER_LOGOUT',
        entityType: 'user',
        entityId: user.id,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });
    }

    // Clear auth cookie
    await clearAuthCookie();

    return NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
