// Static, illustrative recreations of the real screens — not a live data
// fetch (no browser automation available to capture real screenshots this
// pass). Numbers reuse the same real seed figures shown elsewhere on this
// page (UrbanFit Studio's "Fitness Transformation Challenge" gig, Arjun
// Mehta's real profile) so nothing here contradicts the rest of the page.

export const MOCK_PLAN_USAGE = {
  planName: "STARTER",
  campaignsUsed: 2,
  campaignLimit: 5,
  slotsAllocated: 12,
  slotLimit: 22,
};

export const MOCK_GIGS = [
  { title: "Fitness Transformation Challenge", status: "ACTIVE", budget: "₹8K–15K", applications: 12 },
  { title: "Koregaon Park Cafe Review", status: "ACTIVE", budget: "₹3K–7K", applications: 6 },
];

export const MOCK_CREATOR_PROFILE = {
  name: "Arjun Mehta",
  handle: "@arjun_fitlife",
  niche: "Fitness",
  location: "Baner, Pune",
  followers: "72K",
  engagement: "5.8%",
  verified: true,
};

export const MOCK_APPLICATIONS = [
  { name: "Arjun Mehta", handle: "@arjun_fitlife", note: "72K followers, real transformation content — let's talk timeline.", status: "ACCEPTED" },
  { name: "Sneha Kulkarni", handle: "@sneha_styles", note: "Fashion/lifestyle audience, happy to cross-promote the challenge.", status: "PENDING" },
  { name: "Priya Sharma", handle: "@priya_travels_pune", note: "Would love to feature this as part of my Pune wellness series.", status: "PENDING" },
];
