// routes/adminPlans.js — CRUD for subscription plans (admin only).

const express = require("express");
const Plan = require("../models/Plan");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

const ALLOWED_KEYS = [
  "name", "tagline", "features", "monthlyPrice", "yearlyPrice",
  "yearlyDiscountPct", "trialDays", "isActive", "highlighted", "cta", "order",
];

// GET /admin/plans — list all plans sorted by order
router.get("/admin/plans", requireAuth, requireAdmin, async (req, res) => {
  try {
    const plans = await Plan.find().sort({ order: 1, createdAt: 1 });
    res.json({ plans });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// POST /admin/plans — create a new plan
router.post("/admin/plans", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId || !req.body.name) {
      return res.status(400).json({ detail: "planId and name are required" });
    }
    const exists = await Plan.findOne({ planId: planId.toLowerCase().trim() });
    if (exists) return res.status(409).json({ detail: "A plan with that ID already exists" });

    const data = { planId: planId.toLowerCase().trim() };
    ALLOWED_KEYS.forEach((k) => { if (req.body[k] !== undefined) data[k] = req.body[k]; });

    const plan = await Plan.create(data);
    res.status(201).json({ plan });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// PUT /admin/plans/:planId — update a plan
router.put("/admin/plans/:planId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const plan = await Plan.findOne({ planId: req.params.planId });
    if (!plan) return res.status(404).json({ detail: "Plan not found" });

    ALLOWED_KEYS.forEach((k) => { if (req.body[k] !== undefined) plan[k] = req.body[k]; });
    await plan.save();
    res.json({ plan });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// DELETE /admin/plans/:planId — delete a plan
router.delete("/admin/plans/:planId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const plan = await Plan.findOne({ planId: req.params.planId });
    if (!plan) return res.status(404).json({ detail: "Plan not found" });
    await plan.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
