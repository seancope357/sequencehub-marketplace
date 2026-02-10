import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  generateToken,
  verifyToken,
  type JWTPayload,
  type AuthUser,
  type Role
} from '@/lib/auth-utils';

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
