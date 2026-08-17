import type { Plan } from "@/types";

/**
 * Presentation-only copy, keyed by the real plan name from `/api/plans`
 * (Backend/src/services/plan.service.js — "plans are rows, not constants").
 * Numbers (price/campaignLimit/applicationSlotLimit) always come from the
 * API so this can never drift from what the app actually enforces; this
 * file only supplies marketing copy the DB has no reason to store.
 */
export interface PlanMeta {
  description: string;
  extraFeature: string;
  ctaLabel: string;
  highlighted?: boolean;
  badge?: string;
}

export const PLAN_META: Record<string, PlanMeta> = {
  FREE: {
    description: "Get started with You Collab and launch your first creator campaigns.",
    extraFeature: "All core You Collab features included",
    ctaLabel: "Get Started",
  },
  STARTER: {
    description: "For businesses ready to run more creator campaigns.",
    extraFeature: "Everything in Free, plus more campaign capacity",
    ctaLabel: "Choose Starter",
  },
  GROWTH: {
    description: "For growing brands running multiple creator campaigns.",
    extraFeature: "Everything in Free, plus higher campaign capacity",
    ctaLabel: "Choose Growth",
    highlighted: true,
    badge: "Most Popular",
  },
};

/** Not a real plan row — no billing/checkout exists yet, so this is a contact-sales dead end, not a purchasable tier. */
export const ENTERPRISE_PLAN = {
  name: "ENTERPRISE",
  description: "For large-scale campaigns and multi-brand organizations.",
  features: [
    "Unlimited Campaigns",
    "Unlimited Application Slots",
    "Dedicated Account Manager",
    "Priority Support",
  ],
  ctaLabel: "Contact Sales",
};

/** Used only if the public /api/plans call fails, so the landing page never breaks for a signed-out visitor. */
export const FALLBACK_PLANS: Plan[] = [
  { id: "free", name: "FREE", price: 0, campaignLimit: 2, applicationSlotLimit: 10 },
  { id: "starter", name: "STARTER", price: 99, campaignLimit: 5, applicationSlotLimit: 22 },
  { id: "growth", name: "GROWTH", price: 199, campaignLimit: 10, applicationSlotLimit: 48 },
];

/** Cosmetic yearly framing only — plans have one real `price` field, no separate yearly column. */
export const YEARLY_DISCOUNT = 0.16;

export function yearlyPrice(monthlyPrice: number): number {
  if (monthlyPrice === 0) return 0;
  return Math.round(monthlyPrice * 12 * (1 - YEARLY_DISCOUNT));
}
