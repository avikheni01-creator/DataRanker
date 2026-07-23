// routes/plans.js - public subscription tiers for the Pricing page.
// Serves from MongoDB if plans exist, falls back to hardcoded defaults.

const express = require("express");
const Plan = require("../models/Plan");
const { PLANS: DEFAULT_PLANS } = require("../core/plans");

const router = express.Router();

router.get("/plans", async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    if (plans.length > 0) {
      return res.json(plans.map((p) => ({
        id: p.planId,
        name: p.name,
        tagline: p.tagline,
        features: p.features,
        monthlyPrice: p.monthlyPrice,
        yearlyPrice: p.yearlyPrice,
        yearlyDiscountPct: p.yearlyDiscountPct,
        trialDays: p.trialDays,
        highlighted: p.highlighted,
        cta: p.cta,
      })));
    }
    res.json(DEFAULT_PLANS);
  } catch {
    res.json(DEFAULT_PLANS);
  }
});

module.exports = router;
