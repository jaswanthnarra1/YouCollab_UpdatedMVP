import { apiClient, unwrap } from "@/lib/api";
import type { Plan, PlanUsage } from "@/types";

export type { Plan, PlanUsage };

export const plansService = {
  /** Plan catalogue — pricing is rendered from this, never from constants. */
  list: async (): Promise<Plan[]> => {
    const { data } = await apiClient.get("/api/plans");
    return unwrap<Plan[]>(data) ?? [];
  },
  /** Current brand's plan plus live campaign/slot usage. */
  usage: async (): Promise<PlanUsage> => {
    const { data } = await apiClient.get("/api/plans/usage");
    return unwrap<PlanUsage>(data);
  },
  assign: async (planName: string): Promise<PlanUsage> => {
    const { data } = await apiClient.patch("/api/plans/assign", { planName });
    return unwrap<PlanUsage>(data);
  },
};
