import { apiClient, unwrap } from "@/lib/api";
import type { AuthUser } from "@/stores/authStore";

export const authService = {
  async me() {
    const { data } = await apiClient.get("/api/auth/me");
    return unwrap<{ user: AuthUser }>(data);
  },
  async deleteAccount() {
    const { data } = await apiClient.delete("/api/auth/account");
    return unwrap<{ message: string }>(data);
  },
  async updatePreferences(prefs: { notificationPrefs?: Record<string, boolean>; privacyPrefs?: Record<string, boolean> }) {
    const { data } = await apiClient.patch("/api/auth/preferences", prefs);
    return unwrap<{ notificationPrefs: Record<string, boolean>; privacyPrefs: Record<string, boolean> }>(data);
  },
};
