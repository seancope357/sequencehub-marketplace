import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { UserRole } from '@prisma/client';
import { hasRole, isAdmin, isCreator, isCreatorOrAdmin } from '@/lib/auth';

export function useAuth() {
  const { user, isLoading, setUser, logout, refreshUser } = useAuthStore();

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    logout,
    refreshUser,
    hasRole: (role: UserRole) => hasRole(user, role),
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

export function useRequireRole(role: UserRole) {
  const auth = useAuth();

  if (!auth.isLoading && (!auth.isAuthenticated || !auth.hasRole(role))) {
    throw new Error(`${role} role required`);
  }

  return auth;
}
