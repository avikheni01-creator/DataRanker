// core/plans.js — subscription tiers.
//
// `free` is the only tier implemented today and is the default for every new
// user. Paid tiers are scaffolded with PLACEHOLDER names/prices/features —
// edit these freely; nothing is gated by them yet beyond the `comingSoon` flag.
// The frontend Pricing page renders this list verbatim.

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "forever",
    tagline: "Everything you need to rank your first universe.",
    features: [
      "Full ranking pipeline (format → map → rank)",
      "Column mapper & KPI library editor",
      "Results dashboard & Excel export",
    ],
    cta: "Get started",
    active: true,
    comingSoon: false,
    highlighted: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: 49, // PLACEHOLDER price
    period: "month",
    tagline: "For analysts running rankings every day.",
    features: [
      "Everything in Free",
      "Saved pipelines & history (planned)",
      "Larger universes & priority runs (planned)",
    ],
    cta: "Coming soon",
    active: false,
    comingSoon: true,
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null, // custom / contact
    period: "custom",
    tagline: "For funds with bespoke methodology & support needs.",
    features: [
      "Everything in Premium",
      "Custom KPI templates & SSO (planned)",
      "Dedicated support (planned)",
    ],
    cta: "Contact us",
    active: false,
    comingSoon: true,
    highlighted: false,
  },
];

// Valid plan ids for the User model enum.
const PLAN_IDS = PLANS.map((p) => p.id);

module.exports = { PLANS, PLAN_IDS };
