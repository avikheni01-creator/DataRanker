// core/plans.js — hardcoded fallback subscription tiers (used when DB has no plans).
// Admin can override all of these via the Plan Management page (/app/admin/plans).

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "forever",
    tagline: "Admin-assigned free access.",
    features: [
      "Full ranking pipeline",
      "KPI library editor",
      "Results dashboard & Excel export",
    ],
    cta: "Admin assigned",
    active: true,
    comingSoon: false,
    highlighted: false,
  },
  {
    id: "standard",
    name: "Standard",
    price: 0,
    period: "3 months free, then paid",
    tagline: "Default plan for all new signups. First 3 months free.",
    features: [
      "Full ranking pipeline (format → map → rank)",
      "Column mapper & KPI library editor",
      "Results dashboard & Excel export",
      "Screener & Comparison dashboard",
    ],
    cta: "Get started",
    active: true,
    comingSoon: false,
    highlighted: true,
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
