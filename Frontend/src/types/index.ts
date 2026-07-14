export type Role = "BRAND" | "INFLUENCER";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  isOnboarded: boolean;
  name?: string;
  profile?: Record<string, unknown>;
  notificationPrefs?: Record<string, boolean>;
  privacyPrefs?: Record<string, boolean>;
}

export type AppStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface Application {
  id: string;
  gigId: string;
  coverNote: string;
  status: AppStatus;
  createdAt?: string;
  distanceKm?: number | null;
  gig?: { id: string; title: string; category?: string };
  influencer?: {
    id: string;
    name?: string;
    niche?: string;
    bio?: string;
    profileImageUrl?: string;
    instagram?: {
      isConnected: boolean;
      username?: string;
      followersCount?: number;
      mediaCount?: number;
      averageLikes?: number;
      engagementRate?: number;
    };
  };
}

export interface BrandProfilePayload {
  businessName?: string;
  category?: string;
  location?: string;
  pincode: string;
  bio?: string;
  website?: string;
  logoUrl?: string;
}

export interface CreatorProfilePayload {
  name?: string;
  instagramHandle?: string;
  niche?: string;
  pincode: string;
  bio?: string;
  profileImageUrl?: string;
  followerCount?: number;
}

export interface InfluencerOnboardingPayload {
  name: string;
  instagramHandle?: string;
  niche: string;
  pincode: string;
  bio: string;
  followerCount: number;
  profileImageUrl?: string;
}

export interface BrandOnboardingPayload {
  businessName: string;
  category: string;
  location: string;
  pincode: string;
  bio: string;
  website?: string;
  logoUrl?: string;
}

export interface InstagramProfile {
  isConnected: boolean;
  username?: string;
  followersCount?: number;
  followingCount?: number;
  mediaCount?: number;
  averageLikes?: number;
  engagementRate?: number;
  profilePicUrl?: string;
  bio?: string;
}

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
  radiusKm?: number | null;
  distanceKm?: number | null;
  brand?: { businessName?: string; logoUrl?: string; location?: string };
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
  radiusKm?: number | null;
}
