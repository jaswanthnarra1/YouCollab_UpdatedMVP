import { apiClient, unwrap } from "@/lib/api";
import type { InstagramConnectionStatus, InstagramProfile } from "@/types";

export const instagramService = {
  connect: async (): Promise<{ url: string; state: string }> => {
    const { data } = await apiClient.get("/api/instagram/connect");
    return unwrap<{ url: string; state: string }>(data);
  },
  callback: async (code: string, state: string) => {
    const { data } = await apiClient.get("/api/instagram/callback", { params: { code, state } });
    return unwrap(data);
  },
  status: async (): Promise<{ isConnected: boolean; connectionStatus: InstagramConnectionStatus }> => {
    const { data } = await apiClient.get("/api/instagram/status");
    return unwrap(data);
  },
  profile: async (): Promise<InstagramProfile> => {
    const { data } = await apiClient.get("/api/instagram/profile");
    return unwrap<InstagramProfile>(data);
  },
  sync: async (): Promise<InstagramProfile> => {
    const { data } = await apiClient.post("/api/instagram/sync");
    return unwrap<InstagramProfile>(data);
  },
  refresh: async (): Promise<{ tokenExpiresAt: string; lastRefreshAt: string; connectionStatus: InstagramConnectionStatus }> => {
    const { data } = await apiClient.post("/api/instagram/refresh");
    return unwrap(data);
  },
  disconnect: async () => {
    const { data } = await apiClient.delete("/api/instagram/disconnect");
    return unwrap(data);
  },
};
