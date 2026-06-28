import { apiClient, tokenStorage, unwrap } from "@/lib/api";
import type { AuthUser, Role } from "@/stores/authStore";

interface AuthResponse {
  user: AuthUser;
  accessToken?: string;
}

export const authService = {
  async register(name: string, email: string, password: string, role: Role) {
    const { data } = await apiClient.post("/api/auth/register", { name, email, password, role });
    return unwrap<{ message: string }>(data);
  },
  async verifyOtp(email: string, otp: string) {
    const { data } = await apiClient.post("/api/auth/verify-otp", { email, otp });
    const payload = unwrap<AuthResponse>(data);
    if (payload?.accessToken) tokenStorage.set(payload.accessToken);
    return payload;
  },
  async resendOtp(email: string) {
    const { data } = await apiClient.post("/api/auth/resend-otp", { email });
    return unwrap<{ message: string }>(data);
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
  async forgotPassword(email: string) {
    const { data } = await apiClient.post("/api/auth/forgot-password", { email });
    return unwrap<{ message: string }>(data);
  },
  async resetPassword(email: string, otp: string, password: string) {
    const { data } = await apiClient.post("/api/auth/reset-password", { email, otp, password });
    return unwrap<{ message: string }>(data);
  },
};
