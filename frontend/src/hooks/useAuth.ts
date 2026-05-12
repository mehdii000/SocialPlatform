import { create } from 'zustand';
import { silentRefresh, validateToken } from '@/api/auth';
import { setAccessToken, getAccessToken } from '@/api/client';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  initialize: () => Promise<void>;
  setAuth: (userId: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  userId: null,
  initialize: async () => {
    try {
      const hasToken = getAccessToken() !== null;
      if (!hasToken) {
        const refreshed = await silentRefresh();
        if (!refreshed) {
          set({ isAuthenticated: false, isLoading: false });
          return;
        }
      }
      const res = await validateToken();
      set({ isAuthenticated: true, isLoading: false, userId: res.user_id });
    } catch {
      set({ isAuthenticated: false, isLoading: false, userId: null });
    }
  },
  setAuth: (userId: string) => set({ isAuthenticated: true, isLoading: false, userId }),
  clearAuth: () => {
    setAccessToken(null);
    set({ isAuthenticated: false, userId: null });
  },
}));
