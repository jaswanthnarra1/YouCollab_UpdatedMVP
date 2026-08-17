export type Role = "BRAND" | "INFLUENCER";

export interface AuthUser {
  id: string;
  email?: string;
  role: Role;
  isOnboarded: boolean;
  name?: string;
  profile?: Record<string, unknown>;
  notificationPrefs?: Record<string, boolean>;
  privacyPrefs?: Record<string, boolean>;
  /** Single gate the route guards check — true when acceptance is missing or stale vs the server's current terms version. */
  needsTermsAcceptance: boolean;
  hasAcceptedTerms?: boolean;
  termsAcceptedAt?: string | null;
  termsVersion?: string | null;
  /** V1 admin gate — env-allowlisted Clerk user IDs, not a role. */
  isAdmin?: boolean;
}

export type ReferralStatus = "SUBMITTED" | "UNDER_REVIEW" | "ELIGIBLE" | "NOT_ELIGIBLE" | "WINNER";

export interface ReferralSubmission {
  id: string;
  reelUrl: string;
  instagramUsername?: string | null;
  status: ReferralStatus;
  verifiedViews?: number | null;
  isWinner: boolean;
  rewardAmount?: number | null;
  createdAt: string;
  updatedAt: string;
  /** Populated only on admin-list responses. */
  influencer?: { id: string; name?: string; instagramHandle?: string };
}

export type AppStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface Application {
  id: string;
  gigId: string;
  coverNote: string;
  reelUrl?: string | null;
  status: AppStatus;
  createdAt?: string;
  distanceKm?: number | null;
  gig?: {
    id: string;
    title: string;
    category?: string;
    city?: string;
    budgetMin?: number;
    budgetMax?: number;
    deadline?: string;
    status?: GigStatus;
    expiresAt?: string | null;
    brand?: { businessName?: string; logoUrl?: string };
  };
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

/**
 * `instagramHandle` and `followerCount` are intentionally NOT part of these
 * payloads — they're owned by the Meta Graph API and written only by the
 * Instagram integration after a verified OAuth connection. The backend strips
 * them from both request schemas, so including them here would be a lie the
 * compiler couldn't catch.
 */
export interface CreatorProfilePayload {
  name?: string;
  niche?: string;
  pincode: string;
  bio?: string;
  profileImageUrl?: string;
}

export interface InfluencerOnboardingPayload {
  name: string;
  niche: string;
  pincode: string;
  bio: string;
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

export type InstagramConnectionStatus = "CONNECTED" | "RECONNECT_REQUIRED" | "DISCONNECTED";

export interface InstagramProfile {
  isConnected: boolean;
  username?: string;
  /** Display name from the Graph API, distinct from the @handle in `username`. */
  name?: string;
  userId?: string;
  followersCount?: number;
  followingCount?: number;
  mediaCount?: number;
  averageLikes?: number;
  engagementRate?: number;
  profilePicUrl?: string;
  bio?: string;
  accountType?: "BUSINESS" | "MEDIA_CREATOR";
  permissionsGranted?: string;
  connectionStatus?: InstagramConnectionStatus;
  connectedAt?: string;
  lastSyncAt?: string;
  lastRefreshAt?: string;
  tokenExpiresAt?: string;
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
  status?: GigStatus;
  publishedAt?: string | null;
  expiresAt?: string | null;
  /** Total applications this campaign can accept (spent from the brand's slot pool at publish time). */
  applicationSlots?: number;
  /** How many of applicationSlots have been used by received applications. */
  applicationSlotsUsed?: number;
  applicationsReceived?: number;
  /** Whether this Gig currently holds a spent Campaign Credit (false once refunded). */
  creditConsumed?: boolean;
}

/** DRAFT/ACTIVE/EXPIRED/CLOSED replaced the old binary OPEN/CLOSED. */
export type GigStatus = "DRAFT" | "ACTIVE" | "EXPIRED" | "CLOSED";

export interface Plan {
  id: string;
  name: string;
  price: number;
  /** Campaign Credits granted per billing cycle (rolls over, doesn't reset). */
  campaignLimit: number;
  /** Application Slots granted per billing cycle (rolls over, doesn't reset). */
  applicationSlotLimit: number;
}

/** One currently-ACTIVE campaign's slot usage, for the "6/10 applications" breakdown. */
export interface PlanUsageCampaign {
  id: string;
  title: string;
  applicationSlotsAllotted: number;
  applicationSlotsUsed: number;
}

/**
 * V1 Campaign Credit / Application Slot model. `campaignCreditsRemaining` /
 * `applicationSlotsRemaining` are the brand's own live balances (the source
 * of truth — see Backend/src/services/plan.service.js
 * getBrandUsageSummary) — not derived from `plan`, which only describes the
 * per-cycle grant amount.
 */
export interface PlanUsage {
  plan: { id: string; name: string; price: number; campaignCredits: number; applicationSlots: number };
  campaignCreditsRemaining: number;
  applicationSlotsRemaining: number;
  billingCycleStart: string | null;
  billingCycleEnd: string | null;
  campaigns: PlanUsageCampaign[];
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
  applicationSlots?: number;
  status?: "ACTIVE" | "DRAFT";
}
