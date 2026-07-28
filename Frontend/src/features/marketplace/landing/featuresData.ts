export type FeatureIconKey = "shield" | "mapPin" | "messageCircle" | "gauge" | "bell" | "settings";

export interface Feature {
  icon: FeatureIconKey;
  title: string;
  description: string;
}

// Every entry here maps to a real, shipped capability — verified against the
// backend before writing this copy (Backend/src/services/instagram.service.js,
// gig.service.js radius/category filters, the real Messages tab on
// BrandDashboard.tsx, NotificationBell.tsx's 5s poll, and plan.service.js's
// live campaign/slot usage counters). No "AI matching" or analytics-charts
// claim — neither exists in this product.
export const FEATURES: Feature[] = [
  {
    icon: "shield",
    title: "Verified Instagram",
    description: "Every creator connects their real Instagram — followers and reach checked, not claimed.",
  },
  {
    icon: "mapPin",
    title: "Smart Location & Niche Matching",
    description: "Filter by radius, PIN code, and category to find creators who reach your local audience.",
  },
  {
    icon: "messageCircle",
    title: "Secure In-App Messaging",
    description: "Coordinate every collab detail without ever trading phone numbers or leaving the platform.",
  },
  {
    icon: "gauge",
    title: "Live Campaign & Slot Tracking",
    description: "See exactly how many campaigns and application slots your plan has left, in real time.",
  },
  {
    icon: "bell",
    title: "Real-Time Notifications",
    description: "Get notified the moment a creator applies or a brand responds — no manual refreshing.",
  },
  {
    icon: "settings",
    title: "Effortless Campaign Management",
    description: "Create, edit, publish, and expire gigs from one dashboard, start to finish.",
  },
];
