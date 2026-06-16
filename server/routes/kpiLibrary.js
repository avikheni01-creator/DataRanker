// routes/kpiLibrary.js — per-user KPI library CRUD.
//   GET /kpi-library  → user's Tier 1 rows (seeded from defaults on first call)
//   PUT /kpi-library  → replace the user's Tier 1 rows

const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { getOrSeedLibrary } = require("../services/kpiLibrary");

const router = express.Router();

const DIRECTIONS = new Set(["Higher", "Lower"]);

// Validate + normalize an incoming rows payload. Throws on invalid input.
function sanitizeRows(input) {
  if (!Array.isArray(input)) throw new Error("rows must be an array");
  return input.map((r, i) => {
    const template = String(r.template || "").trim();
    const kpi = String(r.kpi || "").trim();
    const weight = Number(r.weight);
    const direction = String(r.direction || "").trim();
    if (!template) throw new Error(`row ${i}: template is required`);
    if (!kpi) throw new Error(`row ${i}: kpi is required`);
    if (!Number.isFinite(weight)) throw new Error(`row ${i}: weight must be a number`);
    if (!DIRECTIONS.has(direction)) throw new Error(`row ${i}: direction must be "Higher" or "Lower"`);
    return { template, kpi, category: String(r.category || "").trim(), weight, direction };
  });
}

router.get("/kpi-library", requireAuth, async (req, res) => {
  try {
    const lib = await getOrSeedLibrary(req.user._id);
    res.json({ name: lib.name, rows: lib.rows, updatedAt: lib.updatedAt });
  } catch (exc) {
    res.status(500).json({ detail: String(exc && exc.message ? exc.message : exc) });
  }
});

router.put("/kpi-library", requireAuth, async (req, res) => {
  try {
    const rows = sanitizeRows(req.body && req.body.rows);
    const lib = await getOrSeedLibrary(req.user._id);
    lib.rows = rows;
    if (typeof req.body.name === "string" && req.body.name.trim()) {
      lib.name = req.body.name.trim();
    }
    await lib.save();
    res.json({ name: lib.name, rows: lib.rows, updatedAt: lib.updatedAt });
  } catch (exc) {
    res.status(400).json({ detail: String(exc && exc.message ? exc.message : exc) });
  }
});

module.exports = router;
