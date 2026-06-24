import { apiClient, unwrap } from "@/lib/api";

export interface Gig {
  id: string;
  title: string;
  description: string;
  deliverables: string;
  budgetMin: number;
  budgetMax: number;
  deadline: string;
  category: string;
  city: string;
  brand?: { businessName?: string; logoUrl?: string };
  createdAt?: string;
  status?: string;
}

export interface CreateGigPayload {
  title: string;
  description: string;
  deliverables: string;
  budgetMin: number;
  budgetMax: number;
  deadline: string;
  category: string;
  city: string;
}

export const gigsService = {
  list: async (): Promise<Gig[]> => {
    const { data } = await apiClient.get("/api/gigs");
    const payload = unwrap<Gig[] | { gigs?: Gig[] }>(data);
    if (Array.isArray(payload)) return payload;
    return payload?.gigs ?? [];
  },
  get: async (id: string): Promise<Gig> => {
    const { data } = await apiClient.get(`/api/gigs/${id}`);
    return unwrap<Gig>(data);
  },
  create: async (body: CreateGigPayload): Promise<Gig> => {
    const { data } = await apiClient.post("/api/gigs", body);
    return unwrap<Gig>(data);
  },
};
