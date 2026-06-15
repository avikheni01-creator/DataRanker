// core/config.js — App-wide constants and column mappings (port of config.py)

// Column mapping from query CSV → output Excel (Stage 1).
// Insertion order matters — it defines Stage 1 output column order.
const COLUMN_MAPPING = {
  Symbol: "NSE Code",
  Description: "Name",
  Sector: "Industry Group",
  Industry: "Industry",
  ROA: "Return on assets",
  ROE: "Return on equity",
  "PAT Growth": "Profit growth",
  "Debt/Equity": "Debt to equity",
  "Revenue Growth": "Sales growth",
  "EBITDA Margin": "OPM",
  ROCE: "Return on capital employed",
  "Quarter Sales": "Sales latest quarter",
  test_Column: "test_Column_input",
};

// Columns added as empty placeholders (Stage 1).
const EXTRA_COLUMNS = ["Exchange"];

// Columns to drop after industry mapping merge (Stage 2).
const MAPPER_DROP_COLUMNS = [
  "190_Industry",
  "Industry_y",
  "Sectors",
  "SCS Sectors",
  "Economic Model",
  "Template",
];

// Excel cell fill colors (Stage 3).
const METRIC_SCORE_COLOR = "E6F3FF";
const RANK_COLOR = "C6EFCE";

// KPI library sheet + header row (Stage 3).
const KPI_SHEET_NAME = "Tier1";
const KPI_HEADER_ROW = 3; // 0-indexed; row 4 holds the header

module.exports = {
  COLUMN_MAPPING,
  EXTRA_COLUMNS,
  MAPPER_DROP_COLUMNS,
  METRIC_SCORE_COLOR,
  RANK_COLOR,
  KPI_SHEET_NAME,
  KPI_HEADER_ROW,
};
