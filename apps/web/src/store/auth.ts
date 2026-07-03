import type { Permission } from '@accentrax/types';
import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: Permission[];
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  /** True until the initial silent-refresh bootstrap on app load resolves. */
  isBootstrapping: boolean;
  setSession: (user: AuthUser, accessToken: string) => void;
  clearSession: () => void;
  finishBootstrap: () => void;
}

/**
 * Access token lives in memory only (never localStorage) to limit XSS
 * exposure; the refresh token is an httpOnly cookie the browser handles.
 * A page reload loses this store, so the app bootstraps by silently
 * calling /auth/refresh on mount to re-hydrate from the cookie.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isBootstrapping: true,
  setSession: (user, accessToken) => set({ user, accessToken }),
  clearSession: () => set({ user: null, accessToken: null }),
  finishBootstrap: () => set({ isBootstrapping: false }),
}));

/** Reads the current access token outside of React (used by the axios interceptor). */
export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}
