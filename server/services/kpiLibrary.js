// services/kpiLibrary.js — load/seed a user's KPI library and adapt it to the
// row shape the ranker expects.

const KpiLibrary = require("../models/KpiLibrary");
const { DEFAULT_TIER1_ROWS } = require("../core/kpiDefaults");

// Return the user's library, lazily creating it from defaults on first access.
async function getOrSeedLibrary(userId) {
  let lib = await KpiLibrary.findOne({ userId });
  if (!lib) {
    lib = await KpiLibrary.create({
      userId,
      name: "default",
      rows: DEFAULT_TIER1_ROWS,
    });
  }
  return lib;
}

// Convert stored rows { template, kpi, weight, direction } into the keys the
// ranker reads: { Template, KPI, "Weight %", "Higher/Lower Better" }.
function toRankerRows(rows) {
  return rows.map((r) => ({
    Template: r.template,
    KPI: r.kpi,
    "Weight %": r.weight,
    "Higher/Lower Better": r.direction,
  }));
}

module.exports = { getOrSeedLibrary, toRankerRows };
