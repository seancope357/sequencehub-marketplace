// Auth helpers for client-side role checks (Supabase Auth compatible)
import { UserRole } from '@prisma/client';
import type { AuthUser } from '@/lib/auth-types';

/**
 * Check if user has a specific role
 */
export function hasRole(user: AuthUser | null, role: UserRole): boolean {
  if (!user) return false;
  return user.roles.some((r) => r.role === role);
}

/**
 * Check if user is admin
 */
export function isAdmin(user: AuthUser | null): boolean {
  return hasRole(user, 'ADMIN');
}

/**
 * Check if user is creator
 */
export function isCreator(user: AuthUser | null): boolean {
  return hasRole(user, 'CREATOR');
}

/**
 * Check if user is creator or admin
 */
export function isCreatorOrAdmin(user: AuthUser | null): boolean {
  return isAdmin(user) || isCreator(user);
}
