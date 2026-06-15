// services/ranker.js — Stage 3: score and rank companies by KPI template.
//
// Port of ranker.py.

const { rank } = require("../lib/rank");
const { readXlsxWithHeader, writeXlsx } = require("../lib/io");
const {
  KPI_HEADER_ROW,
  KPI_SHEET_NAME,
  METRIC_SCORE_COLOR,
  RANK_COLOR,
} = require("../core/config");

function isNum(v) {
  return typeof v === "number" && Number.isFinite(v);
}

// Score one KPI on the subset. Mutates subset rows (adds _Rank,
// _Percentile_Slab, _Metric_Score) and returns the metric-score column name.
function scoreKpi(subset, columns, kpi, weight, direction) {
  const higherIsBetter = String(direction).trim().toLowerCase() === "higher";

  const values = subset.map((r) => {
    const v = r[kpi];
    return isNum(v) ? v : null;
  });

  // Rank 1 = best: "Higher" → ascending=false; "Lower" → ascending=true.
  const rankVals = rank(values, { ascending: !higherIsBetter });

  // Percentile slab: pct=true, ascending=higherIsBetter.
  const pctVals = rank(values, { ascending: higherIsBetter, pct: true });

  const rankCol = `${kpi}_Rank`;
  const slabCol = `${kpi}_Percentile_Slab`;
  const scoreCol = `${kpi}_Metric_Score`;

  for (let i = 0; i < subset.length; i++) {
    subset[i][rankCol] = rankVals[i]; // null stays null

    let slab = null;
    if (pctVals[i] !== null) {
      const rawPct = pctVals[i] * 100;
      slab = Math.ceil(rawPct / 10) * 10;
    }
    subset[i][slabCol] = slab;

    subset[i][scoreCol] = slab === null ? null : slab * weight;
  }

  for (const c of [rankCol, slabCol, scoreCol]) {
    if (!columns.includes(c)) columns.push(c);
  }

  return scoreCol;
}

// mapped: { columns, rows } from Stage 2.
async function runRanking(mapped, kpiBuffer) {
  // Read KPI library, header on 0-indexed row KPI_HEADER_ROW; strip col names.
  const kpiTable = readXlsxWithHeader(kpiBuffer, KPI_SHEET_NAME, KPI_HEADER_ROW);
  const kpiStripped = kpiTable.columns.map((c) => String(c).trim());
  const kpiRows = kpiTable.rows.map((r) => {
    const obj = {};
    for (let i = 0; i < kpiTable.columns.length; i++) {
      obj[kpiStripped[i]] = r[kpiTable.columns[i]];
    }
    return obj;
  });

  // Distinct non-null KPI_Template values in first-appearance order.
  const seen = new Set();
  const templates = [];
  for (const row of mapped.rows) {
    const t = row["KPI_Template"];
    if (t === null || t === undefined || (typeof t === "number" && Number.isNaN(t))) continue;
    if (!seen.has(t)) {
      seen.add(t);
      templates.push(t);
    }
  }

  const sheets = [];
  for (const template of templates) {
    sheets.push(buildTemplateSheet(mapped, kpiRows, template));
  }

  return writeXlsx(sheets);
}

function buildTemplateSheet(mapped, kpiRows, template) {
  // subset = deep-enough copy of rows where KPI_Template === template.
  const subset = mapped.rows
    .filter((r) => r["KPI_Template"] === template)
    .map((r) => Object.assign({}, r));
  const columns = mapped.columns.slice();

  const metrics = kpiRows.filter((m) => m["Template"] === template);

  const scoreCols = [];
  for (const row of metrics) {
    const kpi = row["KPI"];
    const weight = row["Weight %"] / 100;
    const direction = row["Higher/Lower Better"];

    // Skip if kpi not a column in subset, or all subset values null/NaN.
    if (!columns.includes(kpi)) continue;
    const anyValid = subset.some((r) => isNum(r[kpi]));
    if (!anyValid) continue;

    const scoreCol = scoreKpi(subset, columns, kpi, weight, direction);
    scoreCols.push(scoreCol);
  }

  // Total_Final_Score = row-wise sum of *_Metric_Score, skipna; all-null → 0.
  for (const r of subset) {
    let sum = 0;
    for (const sc of scoreCols) {
      const v = r[sc];
      if (isNum(v)) sum += v;
    }
    r["Total_Final_Score"] = sum;
  }
  if (!columns.includes("Total_Final_Score")) columns.push("Total_Final_Score");

  // Company_Rank = rank(Total_Final_Score, ascending=false, method="min").
  const totals = subset.map((r) => r["Total_Final_Score"]);
  const companyRanks = rank(totals, { ascending: false, method: "min" });
  for (let i = 0; i < subset.length; i++) {
    subset[i]["Company_Rank"] = companyRanks[i];
  }
  if (!columns.includes("Company_Rank")) columns.push("Company_Rank");

  const sheetName = String(template).slice(0, 31);

  // Cell fills: columns containing "_Metric_Score" → METRIC_SCORE_COLOR;
  // column exactly "Company_Rank" → RANK_COLOR. (Data rows only.)
  const fills = [];
  for (let ci = 0; ci < columns.length; ci++) {
    const name = columns[ci];
    if (name.includes("_Metric_Score")) {
      fills.push({ colIndex: ci, argb: "FF" + METRIC_SCORE_COLOR });
    } else if (name === "Company_Rank") {
      fills.push({ colIndex: ci, argb: "FF" + RANK_COLOR });
    }
  }

  return { name: sheetName, columns, rows: subset, fills };
}

module.exports = { runRanking };
