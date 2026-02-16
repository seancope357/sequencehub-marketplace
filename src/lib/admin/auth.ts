import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import { AuthUser } from '@/lib/auth-utils';

/**
 * Require admin role for protected routes
 * Throws error if user is not authenticated or not an admin
 */
export async function requireAdmin(request?: NextRequest): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Check if user has ADMIN role
  if (!user.roles.includes(Role.ADMIN)) {
    throw new Error('Forbidden: Admin access required');
  }

  return user;
}

/**
 * Check if current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user ? user.roles.includes(Role.ADMIN) : false;
}

/**
 * Get request metadata for audit logging
 */
export function getRequestMetadata(request: NextRequest) {
  return {
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  };
}
