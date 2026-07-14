import { apiClient, unwrap } from "@/lib/api";

export interface NearbyCreator {
  id: string;
  name: string;
  instagramHandle: string;
  niche: string;
  profileImageUrl?: string | null;
  followerCount: number;
  distanceKm: number | null;
}

export interface NearbyBrand {
  id: string;
  businessName: string;
  category: string;
  logoUrl?: string | null;
  location: string;
  distanceKm: number | null;
}

export interface NearbyResult {
  type: "creators" | "brands";
  items: (NearbyCreator | NearbyBrand)[];
  locationEnabled: boolean;
}

export const discoveryService = {
  nearby: async (): Promise<NearbyResult> => {
    const { data } = await apiClient.get("/api/discovery/nearby");
    const items = unwrap<(NearbyCreator | NearbyBrand)[]>(data);
    return {
      type: data?.meta?.type ?? "creators",
      items,
      locationEnabled: Boolean(data?.meta?.locationEnabled),
    };
  },
};
