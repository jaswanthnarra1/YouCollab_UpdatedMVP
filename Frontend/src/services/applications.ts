import { apiClient, unwrap } from "@/lib/api";
import type { AppStatus, Application } from "@/types";

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
