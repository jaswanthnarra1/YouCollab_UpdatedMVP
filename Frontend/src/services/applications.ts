import { apiClient, unwrap } from "@/lib/api";

export type AppStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface Application {
  id: string;
  gigId: string;
  coverNote: string;
  status: AppStatus;
  createdAt?: string;
  gig?: { id: string; title: string; category?: string };
  influencer?: {
    id: string;
    name?: string;
    niche?: string;
    bio?: string;
    profileImageUrl?: string;
    instagram?: {
      isConnected: boolean;
      username?: string;
      followersCount?: number;
      mediaCount?: number;
      averageLikes?: number;
      engagementRate?: number;
    };
  };
}

export const applicationsService = {
  apply: async (gigId: string, coverNote: string) => {
    const { data } = await apiClient.post("/api/applications", { gigId, coverNote });
    return unwrap<Application>(data);
  },
  mine: async (): Promise<Application[]> => {
    const { data } = await apiClient.get("/api/applications/me");
    const p = unwrap<Application[] | { applications?: Application[] }>(data);
    return Array.isArray(p) ? p : p?.applications ?? [];
  },
  forGig: async (gigId: string): Promise<Application[]> => {
    const { data } = await apiClient.get(`/api/applications/gig/${gigId}`);
    const p = unwrap<Application[] | { applications?: Application[] }>(data);
    return Array.isArray(p) ? p : p?.applications ?? [];
  },
  updateStatus: async (id: string, status: AppStatus) => {
    const { data } = await apiClient.patch(`/api/applications/${id}/status`, { status });
    return unwrap<Application>(data);
  },
};
