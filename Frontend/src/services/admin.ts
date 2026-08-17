import { apiClient, unwrap } from "@/lib/api";

export interface AdminBrand {
  id: string;
  businessName: string;
  campaignCreditsRemaining: number;
  applicationSlotsRemaining: number;
  billingCycleStart: string | null;
  billingCycleEnd: string | null;
  plan: { id: string; name: string } | null;
}

export interface AdminUpdateBrandPlanPayload {
  planName?: "FREE" | "STARTER" | "GROWTH";
  campaignCredits?: number;
  applicationSlots?: number;
  reason?: string;
}

export const adminService = {
  listBrands: async (): Promise<AdminBrand[]> => {
    const { data } = await apiClient.get("/api/admin/brands");
    return unwrap<AdminBrand[]>(data) ?? [];
  },
  updateBrandPlan: async (brandId: string, payload: AdminUpdateBrandPlanPayload) => {
    const { data } = await apiClient.patch(`/api/admin/brands/${brandId}/plan`, payload);
    return unwrap(data);
  },
};
