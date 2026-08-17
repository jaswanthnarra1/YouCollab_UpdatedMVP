import { apiClient, unwrap } from "@/lib/api";
import type { Plan, PlanChangeRequest, PlanUsage } from "@/types";

export type { Plan, PlanUsage, PlanChangeRequest };

export const plansService = {
  /** Plan catalogue — pricing is rendered from this, never from constants. */
  list: async (): Promise<Plan[]> => {
    const { data } = await apiClient.get("/api/plans");
    return unwrap<Plan[]>(data) ?? [];
  },
  /** Current brand's Campaign Credits / Application Slots / billing cycle + latest plan-change request. */
  usage: async (): Promise<PlanUsage> => {
    const { data } = await apiClient.get("/api/plans/usage");
    return unwrap<PlanUsage>(data);
  },
  /**
   * Request a plan change. Creates a PENDING request only — never applies
   * it. An admin reviews and applies it via the admin plan-requests queue.
   * No self-service assign in V1.
   */
  request: async (planName: "FREE" | "STARTER" | "GROWTH"): Promise<PlanChangeRequest> => {
    const { data } = await apiClient.post("/api/plans/request", { planName });
    return unwrap<PlanChangeRequest>(data);
  },
};
