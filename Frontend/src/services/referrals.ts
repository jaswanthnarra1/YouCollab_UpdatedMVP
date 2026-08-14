import { apiClient, unwrap } from "@/lib/api";
import type { ReferralSubmission } from "@/types";

interface Paginated<T> {
  data: T[];
  pagination: { nextCursor: string | null; hasMore: boolean; total: number };
}

export const referralsService = {
  submit: async (reelUrl: string, instagramUsername?: string) => {
    const { data } = await apiClient.post("/api/referrals", { reelUrl, instagramUsername: instagramUsername || undefined });
    return unwrap<ReferralSubmission>(data);
  },
  mine: async (): Promise<ReferralSubmission[]> => {
    const { data } = await apiClient.get("/api/referrals/me");
    return unwrap<ReferralSubmission[]>(data);
  },
  adminList: async (cursor?: string): Promise<Paginated<ReferralSubmission>> => {
    const { data } = await apiClient.get("/api/admin/referrals", { params: cursor ? { cursor } : undefined });
    return data.data !== undefined
      ? { data: data.data, pagination: data.pagination }
      : { data: [], pagination: { nextCursor: null, hasMore: false, total: 0 } };
  },
  adminMarkUnderReview: async (id: string) => {
    const { data } = await apiClient.patch(`/api/admin/referrals/${id}/review`);
    return unwrap<ReferralSubmission>(data);
  },
  adminSetVerifiedViews: async (id: string, verifiedViews: number) => {
    const { data } = await apiClient.patch(`/api/admin/referrals/${id}/verified-views`, { verifiedViews });
    return unwrap<ReferralSubmission>(data);
  },
  adminMarkWinner: async (id: string) => {
    const { data } = await apiClient.post(`/api/admin/referrals/${id}/winner`);
    return unwrap<ReferralSubmission>(data);
  },
};
