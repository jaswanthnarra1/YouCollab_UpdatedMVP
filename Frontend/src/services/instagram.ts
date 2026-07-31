import { apiClient, unwrap } from "@/lib/api";
import type { InstagramConnectionStatus, InstagramProfile } from "@/types";

/**
 * sessionStorage key holding the in-app path the user was on when they started
 * the Instagram connect flow, so InstagramCallback can return them to exactly
 * that page. Lives here (rather than in the lazy-loaded callback component) so
 * importing it doesn't pull that chunk into the dashboard bundle.
 */
export const IG_RETURN_TO_KEY = "yc.ig.returnTo";

/**
 * sessionStorage key holding the reason the last connect attempt failed.
 * A toast alone is too transient here: the callback redirects immediately
 * after showing it, so a user who looks away misses the only explanation
 * they get. Persisting it lets the card show a durable, dismissible reason.
 */
export const IG_LAST_ERROR_KEY = "yc.ig.lastError";

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
