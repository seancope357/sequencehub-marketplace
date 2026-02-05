import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser } from '@/lib/auth-types';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  hasInitialized: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      hasInitialized: false,

      setUser: (user) => set({ user, isLoading: false }),

      setLoading: (loading) => set({ isLoading: loading }),

      logout: async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
          set({ user: null, isLoading: false });
        } catch (error) {
          console.error('Logout error:', error);
          set({ isLoading: false });
        }
      },

      initialize: async () => {
        if (get().hasInitialized) return;
        set({ hasInitialized: true });
        await get().refreshUser();
      },

      refreshUser: async () => {
        const currentUser = get().user;
        try {
          if (!currentUser) {
            set({ isLoading: true });
          } else if (get().isLoading) {
            set({ isLoading: false });
          }

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);

          const response = await fetch('/api/auth/me', {
            credentials: 'include',
            cache: 'no-store',
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (response.ok) {
            const data = await response.json();
            set({ user: data.user, isLoading: false });
          } else if (response.status === 401 || response.status === 403) {
            set({ user: null, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            console.warn('Refresh user request timed out');
          } else {
            console.error('Refresh user error:', error);
          }
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
