import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import type { RoleName } from '@/lib/auth-types';
import { hasRole, isAdmin, isCreator, isCreatorOrAdmin } from '@/lib/auth-utils';

export function useAuth() {
  const { user, isLoading, setUser, logout, initialize, refreshUser } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    logout,
    refreshUser,
    hasRole: (role: RoleName) => hasRole(user, role),
    isAdmin: isAdmin(user),
    isCreator: isCreator(user),
    isCreatorOrAdmin: isCreatorOrAdmin(user),
  };
}

export function useRequireAuth() {
  const auth = useAuth();

  if (!auth.isLoading && !auth.isAuthenticated) {
    throw new Error('Authentication required');
  }

  return auth;
}

export function useRequireRole(role: RoleName) {
  const auth = useAuth();

  if (!auth.isLoading && (!auth.isAuthenticated || !auth.hasRole(role))) {
    throw new Error(`${role} role required`);
  }

  return auth;
}
