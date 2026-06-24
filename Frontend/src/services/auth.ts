import { apiClient, tokenStorage, unwrap } from "@/lib/api";
import type { AuthUser, Role } from "@/stores/authStore";

interface AuthResponse {
  user: AuthUser;
  accessToken?: string;
}

export const authService = {
  async register(email: string, password: string, role: Role) {
    const { data } = await apiClient.post("/api/auth/register", { email, password, role });
    const payload = unwrap<AuthResponse>(data);
    if (payload?.accessToken) tokenStorage.set(payload.accessToken);
    return payload;
  },
  async login(email: string, password: string) {
    const { data } = await apiClient.post("/api/auth/login", { email, password });
    const payload = unwrap<AuthResponse>(data);
    if (payload?.accessToken) tokenStorage.set(payload.accessToken);
    return payload;
  },
  async refresh() {
    const { data } = await apiClient.post("/api/auth/refresh");
    const payload = unwrap<AuthResponse>(data);
    if (payload?.accessToken) tokenStorage.set(payload.accessToken);
    return payload;
  },
  async logout() {
    try {
      await apiClient.post("/api/auth/logout");
    } catch {
      /* noop */
    }
    tokenStorage.set(null);
  },
};
