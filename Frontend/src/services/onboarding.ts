import { apiClient, unwrap } from "@/lib/api";

export interface InfluencerOnboardingPayload {
  name: string;
  instagramHandle?: string;
  niche: string;
  bio: string;
  followerCount: number;
  profileImageUrl?: string;
}

export interface BrandOnboardingPayload {
  businessName: string;
  category: string;
  location: string;
  bio: string;
  website?: string;
  logoUrl?: string;
}

export const onboardingService = {
  influencer: async (body: InfluencerOnboardingPayload) => {
    const { data } = await apiClient.post("/api/onboarding/influencer", body);
    return unwrap(data);
  },
  brand: async (body: BrandOnboardingPayload) => {
    const { data } = await apiClient.post("/api/onboarding/brand", body);
    return unwrap(data);
  },
};
