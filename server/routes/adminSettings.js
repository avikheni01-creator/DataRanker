// routes/adminSettings.js - app-wide settings (admin write, auth read).

const express = require("express");
const AppSettings = require("../models/AppSettings");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

const ALLOWED_KEYS = [
  "allowCustomUpload",
  "screenerEnabled",
  "comparisonEnabled",
  "kpiEditorLocked",
  "screenerMaxRows",
  "maintenanceBanner",
];

// Auth-gated (not admin-only): returns the subset of settings the frontend
// needs to gate features for any logged-in user.
router.get("/app-config", requireAuth, async (req, res) => {
  try {
    const s = await AppSettings.getOrCreate();
    res.json({
      allowCustomUpload:  s.allowCustomUpload,
      screenerEnabled:    s.screenerEnabled,
      comparisonEnabled:  s.comparisonEnabled,
      kpiEditorLocked:    s.kpiEditorLocked,
      screenerMaxRows:    s.screenerMaxRows,
      maintenanceBanner:  s.maintenanceBanner,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Admin read - returns full document (includes timestamps).
router.get("/admin/settings", requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json(await AppSettings.getOrCreate());
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Admin write - partial update, only allowed keys.
router.put("/admin/settings", requireAuth, requireAdmin, async (req, res) => {
  try {
    const settings = await AppSettings.getOrCreate();
    ALLOWED_KEYS.forEach((key) => {
      if (key in req.body) settings[key] = req.body[key];
    });
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
