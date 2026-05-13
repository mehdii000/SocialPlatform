import { create } from 'zustand';
import { silentRefresh, validateToken } from '@/api/auth';
import { setAccessToken, getAccessToken } from '@/api/client';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  username: string | null;
  initialize: () => Promise<void>;
  setAuth: (userId: string, username: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  userId: null,
  username: null,
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
      set({ isAuthenticated: true, isLoading: false, userId: res.user_id, username: res.username });
    } catch {
      set({ isAuthenticated: false, isLoading: false, userId: null, username: null });
    }
  },
  setAuth: (userId: string, username: string) => set({ isAuthenticated: true, isLoading: false, userId, username }),
  clearAuth: () => {
    setAccessToken(null);
    set({ isAuthenticated: false, userId: null, username: null });
  },
}));
