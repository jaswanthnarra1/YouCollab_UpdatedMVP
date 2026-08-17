import { apiClient, unwrap } from "@/lib/api";
import type { PlanChangeRequest, PlanChangeRequestStatus } from "@/types";

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
  listPlanRequests: async (status?: PlanChangeRequestStatus): Promise<PlanChangeRequest[]> => {
    const { data } = await apiClient.get("/api/admin/plan-requests", { params: status ? { status } : undefined });
    return unwrap<PlanChangeRequest[]>(data) ?? [];
  },
  approvePlanRequest: async (id: string): Promise<PlanChangeRequest> => {
    const { data } = await apiClient.patch(`/api/admin/plan-requests/${id}/approve`);
    return unwrap<PlanChangeRequest>(data);
  },
  rejectPlanRequest: async (id: string): Promise<PlanChangeRequest> => {
    const { data } = await apiClient.patch(`/api/admin/plan-requests/${id}/reject`);
    return unwrap<PlanChangeRequest>(data);
  },
};
