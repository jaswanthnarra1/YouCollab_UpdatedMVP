import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role, AuthUser } from "@/types";

interface AuthState {
  user: AuthUser | null;
  hydrated: boolean;
  setUser: (u: AuthUser | null) => void;
  setHydrated: (b: boolean) => void;
  patchUser: (patch: Partial<AuthUser>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      setUser: (user) => set({ user }),
      setHydrated: (hydrated) => set({ hydrated }),
      patchUser: (patch) =>
        set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),
      logout: () => set({ user: null }),
    }),
    {
      name: "yc.auth",
      /**
       * Persist ONLY the user profile. `hydrated` is per-page-load session
       * state: it means "AuthBootstrap has finished asking Clerk who this is".
       *
       * Persisting it was a real bug — the store rehydrated with
       * `hydrated: true` synchronously on every subsequent page load, so
       * AuthBootstrap's gate passed *before* Clerk had initialised. Children
       * mounted and fired API calls while `window.Clerk.session` was still
       * undefined, so the axios interceptor attached no Authorization header
       * and the backend replied 401. Query-backed screens masked it by
       * refetching; the Instagram OAuth callback (which fires exactly once)
       * failed permanently, leaving the account unconnected with no clue why.
       */
      partialize: (state) => ({ user: state.user }),
    }
  )
);
