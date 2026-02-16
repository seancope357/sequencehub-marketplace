// Utility functions for authentication (no 'use server' - these are NOT Server Actions)
import { User, Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import tokenBlacklist, { generateTokenId } from '@/lib/token-blacklist';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '7d'; // 7 days

export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
}

export interface AuthUser extends Omit<User, 'passwordHash'> {
  roles: Role[];
}

/**
 * Generate a JWT token
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify a JWT token
 * Checks both JWT validity and blacklist status
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    // First check if token is blacklisted
    const tokenId = generateTokenId(token);
    if (tokenBlacklist.isBlacklisted(tokenId)) {
      console.log('[Auth] Token is blacklisted (revoked)');
      return null;
    }

    // Then verify JWT signature and expiry
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: AuthUser | null, role: Role): boolean {
  if (!user) return false;
  return user.roles.includes(role);
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
