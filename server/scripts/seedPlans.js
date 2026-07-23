// scripts/seedPlans.js
// Usage: run from server/ directory → node scripts/seedPlans.js
// Upserts Standard and Premium plans into MongoDB. Safe to re-run.

require("dotenv").config();
const mongoose = require("mongoose");
const Plan     = require("../models/Plan");

const PLANS = [
  {
    planId:            "standard",
    name:              "Standard",
    tagline:           "Everything you need to rank, analyse, and compare stocks — free for 3 months.",
    order:             1,
    isActive:          true,
    highlighted:       true,
    cta:               "Start free trial",
    monthlyPrice:      499,
    yearlyPrice:       4999,
    yearlyDiscountPct: 17,
    trialDays:         90,
    features: [
      "Rank any stock universe in minutes — upload a Screener.in CSV and get a scored, sorted Excel instantly",
      "Smart composite scoring across profitability, valuation, growth & efficiency",
      "Filter stocks with simple expressions before you rank (e.g. PE < 20 AND ROE > 15)",
      "Compare 2–6 companies head-to-head with radar charts, bar charts & percentile rankings",
      "Company deep dive — live price, margins, ROE, EV/EBITDA, ownership & 1-year price chart",
      "Customise KPI weights to match your investment style",
      "Email yourself a PDF summary of top-ranked companies in one click",
      "Daily pre-loaded screener snapshot — no upload needed",
      "Results saved automatically — come back without re-uploading",
    ],
  },
  {
    planId:            "premium",
    name:              "Premium",
    tagline:           "Advanced analytics, real-time alerts, watchlists & AI interpretation on top of everything in Standard.",
    order:             2,
    isActive:          true,
    highlighted:       false,
    cta:               "Contact us to upgrade",
    monthlyPrice:      0,
    yearlyPrice:       0,
    yearlyDiscountPct: 0,
    trialDays:         0,
    features: [
      "Everything in Standard",
      "Detailed stock analysis — deep-dive fundamental scores, margin breakdowns & ratio analysis",
      "Logical comparison dashboard — sector benchmarking, leaderboard scoring & radar charts",
      "Alerts for critical news — real-time notifications on earnings, downgrades & macro signals",
      "Custom stock watchlist — track price, KPIs & movement across your curated universe",
      "Daily company announcements — live BSE/NSE feed of results, board meetings & disclosures",
      "Historical data — multi-year OHLCV & fundamental time-series to back-test theses",
      "AI Interpretation Engine — LLM-powered plain-language insights grounded in your own ranked data",
    ],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  for (const plan of PLANS) {
    const result = await Plan.findOneAndUpdate(
      { planId: plan.planId },
      { $set: plan },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`✓ ${result.name} plan seeded (id: ${result.planId})`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
