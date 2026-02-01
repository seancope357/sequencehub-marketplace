'use server';

import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { User, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
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
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
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
 * Get the current user from cookies
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return null;
    }

    const payload = verifyToken(token);
    if (!payload) {
      return null;
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      include: {
        roles: true,
        profile: true,
      },
    });

    if (!user) {
      return null;
    }

    // Remove passwordHash from returned user
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword as AuthUser;
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

/**
 * Set auth cookie
 */
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

/**
 * Clear auth cookie
 */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}

/**
 * Create user session (login)
 */
export async function createSession(email: string, password: string): Promise<AuthUser | null> {
  const user = await db.user.findUnique({
    where: { email },
    include: {
      roles: true,
      profile: true,
    },
  });

  if (!user || !user.passwordHash) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  // Generate JWT token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    roles: user.roles.map((r) => r.role),
  });

  // Set auth cookie
  await setAuthCookie(token);

  // Remove passwordHash from returned user
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword as AuthUser;
}

/**
 * Register a new user
 */
export async function registerUser(
  email: string,
  password: string,
  name?: string
): Promise<AuthUser | null> {
  // Check if user already exists
  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return null;
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user with BUYER role
  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      name,
      roles: {
        create: {
          role: 'BUYER',
        },
      },
    },
    include: {
      roles: true,
      profile: true,
    },
  });

  // Generate JWT token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    roles: user.roles.map((r) => r.role),
  });

  // Set auth cookie
  await setAuthCookie(token);

  // Remove passwordHash from returned user
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword as AuthUser;
}

/**
 * Assign a role to a user
 */
export async function assignRole(userId: string, role: UserRole): Promise<void> {
  await db.userRole.upsert({
    where: {
      userId_role: {
        userId,
        role,
      },
    },
    update: {},
    create: {
      userId,
      role,
    },
  });
}

/**
 * Remove a role from a user
 */
export async function removeRole(userId: string, role: UserRole): Promise<void> {
  await db.userRole.deleteMany({
    where: {
      userId,
      role,
    },
  });
}

/**
 * Create audit log entry
 */
export async function createAuditLog(params: {
  userId?: string;
  orderId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  changes?: string;
  metadata?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  await db.auditLog.create({
    data: params,
  });
}
