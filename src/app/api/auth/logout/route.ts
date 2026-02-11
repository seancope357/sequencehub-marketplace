import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, clearAuthCookie, createAuditLog } from '@/lib/auth';;
import { cookies } from 'next/headers';
import tokenBlacklist, { generateTokenId } from '@/lib/token-blacklist';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Get the token before clearing the cookie
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (token) {
      // Decode token to get expiry time
      try {
        const decoded = jwt.decode(token) as { exp?: number };
        const expiresAt = decoded?.exp || Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);

        // Add token to blacklist
        const tokenId = generateTokenId(token);
        tokenBlacklist.add(tokenId, expiresAt);

        console.log('[Auth] Token blacklisted on logout');
      } catch (error) {
        console.error('[Auth] Error blacklisting token:', error);
        // Continue with logout even if blacklisting fails
      }
    }

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
