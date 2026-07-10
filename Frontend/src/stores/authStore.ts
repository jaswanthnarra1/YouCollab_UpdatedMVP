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
    { name: "yc.auth" }
  )
);
