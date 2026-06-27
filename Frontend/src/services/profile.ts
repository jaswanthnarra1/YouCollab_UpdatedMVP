import { apiClient, unwrap } from "@/lib/api";
import type { AuthUser } from "@/stores/authStore";

export interface BrandProfilePayload {
  businessName?: string;
  category?: string;
  location?: string;
  bio?: string;
  website?: string;
  logoUrl?: string;
}

export interface CreatorProfilePayload {
  name?: string;
  instagramHandle?: string;
  niche?: string;
  bio?: string;
  profileImageUrl?: string;
  followerCount?: number;
}

export const profileService = {
  getProfile: async (): Promise<AuthUser> => {
    const { data } = await apiClient.get("/api/profile");
    return unwrap<AuthUser>(data);
  },
  updateProfile: async (body: BrandProfilePayload | CreatorProfilePayload): Promise<any> => {
    const { data } = await apiClient.patch("/api/profile", body);
    return unwrap(data);
  },
};
