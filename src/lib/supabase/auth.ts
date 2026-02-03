/**
 * Supabase Auth Wrapper
 * Replaces custom JWT authentication with Supabase Auth
 */

import 'server-only';

import { createServerClient, createAdminClient } from './client';
import type { AuthUser, RoleName } from '@/lib/auth-types';
import { User as SupabaseUser } from '@supabase/supabase-js';

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * Get the current authenticated user
 * Replaces: getCurrentUser() from old auth.ts
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createServerClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // Fetch user data from public.users
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select(`
      *,
      roles:user_roles(id, role),
      profile:profiles(*)
    `)
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    return null;
  }

  return {
    id: user.id,
    email: user.email!,
    name: userData.name,
    avatar: userData.avatar,
    emailVerified: user.email_confirmed_at !== null,
    roles: userData.roles || [],
    profile: userData.profile || null,
    createdAt: userData.created_at,
    updatedAt: userData.updated_at
  };
}

/**
 * Register a new user
 * Replaces: registerUser() from old auth.ts
 */
export async function registerUser(
  email: string,
  password: string,
  name?: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  const supabase = await createServerClient();

  // Create user in Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || email.split('@')[0],
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`
    }
  });

  if (error) {
    return { user: null, error: error.message };
  }

  if (!data.user) {
    return { user: null, error: 'Failed to create user' };
  }

  // User record in public.users and default BUYER role
  // are created automatically via database trigger (handle_new_user)

  // Fetch complete user data
  const authUser = await getCurrentUser();

  return { user: authUser, error: null };
}

/**
 * Login user with email and password
 * Replaces: createSession() from old auth.ts
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { user: null, error: error.message };
  }

  if (!data.user) {
    return { user: null, error: 'Login failed' };
  }

  // Create audit log
  await createAuditLog({
    userId: data.user.id,
    action: 'USER_LOGIN',
    entityType: 'user',
    entityId: data.user.id
  });

  // Fetch complete user data
  const authUser = await getCurrentUser();

  return { user: authUser, error: null };
}

/**
 * Logout current user
 */
export async function logoutUser(): Promise<{ error: string | null }> {
  const supabase = await createServerClient();

  const user = await getCurrentUser();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  // Create audit log
  if (user) {
    await createAuditLog({
      userId: user.id,
      action: 'USER_LOGOUT',
      entityType: 'user',
      entityId: user.id
    });
  }

  return { error: null };
}

/**
 * Request password reset email
 */
export async function resetPassword(email: string): Promise<{ error: string | null }> {
  const supabase = await createServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset-password`
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  const supabase = await createServerClient();

  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    return { error: error.message };
  }

  const user = await getCurrentUser();
  if (user) {
    await createAuditLog({
      userId: user.id,
      action: 'USER_UPDATED',
      entityType: 'user',
      entityId: user.id,
      metadata: JSON.stringify({ action: 'password_changed' })
    });
  }

  return { error: null };
}

// ============================================
// ROLE MANAGEMENT
// ============================================

/**
 * Check if user has a specific role
 * Replaces: hasRole() from old auth.ts
 */
export function hasRole(user: AuthUser | null, role: RoleName): boolean {
  if (!user) return false;
  return user.roles.some((r) => r.role === role);
}

/**
 * Check if user is admin
 * Replaces: isAdmin() from old auth.ts
 */
export function isAdmin(user: AuthUser | null): boolean {
  return hasRole(user, 'ADMIN');
}

/**
 * Check if user is creator
 * Replaces: isCreator() from old auth.ts
 */
export function isCreator(user: AuthUser | null): boolean {
  return hasRole(user, 'CREATOR');
}

/**
 * Check if user is creator or admin
 * Replaces: isCreatorOrAdmin() from old auth.ts
 */
export function isCreatorOrAdmin(user: AuthUser | null): boolean {
  return isAdmin(user) || isCreator(user);
}

/**
 * Assign a role to a user (ADMIN only)
 * Replaces: assignRole() from old auth.ts
 */
export async function assignRole(
  userId: string,
  role: RoleName
): Promise<{ error: string | null }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('user_roles')
    .upsert({
      user_id: userId,
      role: role
    }, {
      onConflict: 'user_id,role'
    });

  if (error) {
    return { error: error.message };
  }

  await createAuditLog({
    userId,
    action: 'USER_UPDATED',
    entityType: 'role',
    entityId: userId,
    metadata: JSON.stringify({ role_added: role })
  });

  return { error: null };
}

/**
 * Remove a role from a user (ADMIN only)
 * Replaces: removeRole() from old auth.ts
 */
export async function removeRole(
  userId: string,
  role: RoleName
): Promise<{ error: string | null }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', role);

  if (error) {
    return { error: error.message };
  }

  await createAuditLog({
    userId,
    action: 'USER_UPDATED',
    entityType: 'role',
    entityId: userId,
    metadata: JSON.stringify({ role_removed: role })
  });

  return { error: null };
}

// ============================================
// AUDIT LOGGING
// ============================================

/**
 * Create audit log entry
 * Replaces: createAuditLog() from old auth.ts
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
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: params.userId,
      order_id: params.orderId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      changes: params.changes ? JSON.parse(params.changes) : null,
      metadata: params.metadata ? JSON.parse(params.metadata) : null,
      ip_address: params.ipAddress,
      user_agent: params.userAgent
    });

  if (error) {
    console.error('Failed to create audit log:', error);
  }
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Get all users (ADMIN only)
 */
export async function getAllUsers(): Promise<AuthUser[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      roles:user_roles(id, role),
      profile:profiles(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get users:', error);
    return [];
  }

  return data.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    emailVerified: user.email_verified || false,
    roles: user.roles || [],
    profile: user.profile || null,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  }));
}

/**
 * Delete user (ADMIN only)
 */
export async function deleteUser(userId: string): Promise<{ error: string | null }> {
  const adminClient = createAdminClient();

  // Delete from Supabase Auth
  const { error: authError } = await adminClient.auth.admin.deleteUser(userId);

  if (authError) {
    return { error: authError.message };
  }

  // Database cascade will handle deletion from public.users and related tables

  await createAuditLog({
    userId,
    action: 'USER_DELETED',
    entityType: 'user',
    entityId: userId
  });

  return { error: null };
}
