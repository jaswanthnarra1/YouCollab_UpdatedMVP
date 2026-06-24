import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "BRAND" | "INFLUENCER";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  isOnboarded: boolean;
  name?: string;
  profile?: Record<string, unknown>;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  hydrated: boolean;
  setUser: (u: AuthUser | null) => void;
  setToken: (t: string | null) => void;
  setHydrated: (b: boolean) => void;
  patchUser: (patch: Partial<AuthUser>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      hydrated: false,
      setUser: (user) => set({ user }),
      setToken: (accessToken) => set({ accessToken }),
      setHydrated: (hydrated) => set({ hydrated }),
      patchUser: (patch) =>
        set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),
      logout: () => set({ user: null, accessToken: null }),
    }),
    { name: "yc.auth" }
  )
);
