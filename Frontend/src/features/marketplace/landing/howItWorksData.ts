export type StepIconKey = "userPlus" | "building" | "megaphone" | "inbox" | "handshake" | "trendingUp";

export interface HowItWorksStep {
  icon: StepIconKey;
  title: string;
  description: string;
}

// Each step mirrors a real route/flow in the app — not aspirational copy.
export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    icon: "userPlus",
    title: "Create Your Account",
    description: "Sign up as a brand or creator with email + password in under two minutes.",
  },
  {
    icon: "building",
    title: "Build Your Profile",
    description: "Brands add business details; creators connect Instagram for verification.",
  },
  {
    icon: "megaphone",
    title: "Publish a Campaign",
    description: "Post a gig with budget, category, and a location radius that matches your area.",
  },
  {
    icon: "inbox",
    title: "Receive Applications",
    description: "Review structured pitches from creators — no more sorting through DMs.",
  },
  {
    icon: "handshake",
    title: "Hire & Message",
    description: "Accept an applicant and coordinate every detail through secure in-app messaging.",
  },
  {
    icon: "trendingUp",
    title: "Track Your Campaigns",
    description: "See live campaign and application-slot usage on your dashboard, always up to date.",
  },
];
