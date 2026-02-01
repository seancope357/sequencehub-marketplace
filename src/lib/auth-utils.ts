// Utility functions for authentication (no 'use server' - these are NOT Server Actions)
import { User, UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';

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

export interface Role {
  id: string;
  role: UserRole;
}

/**
 * Generate a JWT token
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

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
