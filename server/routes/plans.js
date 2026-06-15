// routes/plans.js — public subscription tiers for the Pricing page.

const express = require("express");
const { PLANS } = require("../core/plans");

const router = express.Router();

router.get("/plans", (req, res) => {
  res.json(PLANS);
});

module.exports = router;
