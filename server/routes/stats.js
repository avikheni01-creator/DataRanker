// routes/stats.js — public GET /stats for the landing page social-proof strip.
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const ScreenerSnapshot = require("../models/ScreenerSnapshot");

router.get("/stats", async (req, res) => {
  try {
    const [analysts, snap] = await Promise.all([
      User.countDocuments(),
      ScreenerSnapshot.findOne().sort({ uploadedAt: -1 }).lean(),
    ]);
    res.json({
      analysts,
      companies: snap ? snap.rows.length : 0,
      templates: 14,
    });
  } catch {
    res.json({ analysts: 0, companies: 0, templates: 14 });
  }
});

module.exports = router;
