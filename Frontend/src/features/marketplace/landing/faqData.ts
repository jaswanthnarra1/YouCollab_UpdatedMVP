export interface FaqEntry {
  question: string;
  answer: string;
}

// Answers are honest about the product's current state — no aspirational
// claims (no fake billing system, no fake agency mode) presented as fact.
export const FAQ_ENTRIES: FaqEntry[] = [
  {
    question: "How does You Collab work?",
    answer:
      "Brands post a campaign with a budget, category, and location radius. Verified creators nearby apply with a pitch, the brand reviews and accepts one, and you coordinate the rest through secure in-app messaging.",
  },
  {
    question: "Can creators join for free?",
    answer:
      "Yes. Creators sign up and apply to campaigns at no cost. Brands get a Free plan too, with a limited number of active campaigns and application slots.",
  },
  {
    question: "How are payments handled?",
    answer:
      "Today, plan upgrades and campaign budgets are arranged directly between brands and creators — self-serve in-app billing is coming soon. Contact us if you'd like help getting set up on a paid plan.",
  },
  {
    question: "How are creators verified?",
    answer:
      "Creators connect their real Instagram account, so their follower count and profile are confirmed rather than self-reported.",
  },
  {
    question: "Can I upgrade my plan later?",
    answer:
      "Yes — you can move to a higher plan at any time to unlock more active campaigns and application slots.",
  },
  {
    question: "Do you offer enterprise solutions?",
    answer:
      "For large-scale or multi-brand needs, reach out through our contact page and we'll work out a plan that fits.",
  },
  {
    question: "Can agencies use You Collab?",
    answer:
      "Right now, each account represents a single brand or creator — there's no dedicated multi-client agency mode yet. It's on our roadmap; contact us if this is something you need.",
  },
];
