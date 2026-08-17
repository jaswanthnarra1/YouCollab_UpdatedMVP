import { apiClient, unwrap } from "@/lib/api";
import type { Plan, PlanUsage } from "@/types";

export type { Plan, PlanUsage };

export const plansService = {
  /** Plan catalogue — pricing is rendered from this, never from constants. */
  list: async (): Promise<Plan[]> => {
    const { data } = await apiClient.get("/api/plans");
    return unwrap<Plan[]>(data) ?? [];
  },
  /** Current brand's Campaign Credits / Application Slots / billing cycle. */
  usage: async (): Promise<PlanUsage> => {
    const { data } = await apiClient.get("/api/plans/usage");
    return unwrap<PlanUsage>(data);
  },
  // No self-service assign in V1 — plan changes are manual, made by an admin
  // via /api/admin/brands/:brandId/plan. See services/admin.ts.
};
