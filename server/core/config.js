// core/config.js - App-wide constants and column mappings (port of config.py)

// Column mapping from query CSV → output Excel (Stage 1).
// Insertion order matters - it defines Stage 1 output column order.
//
// Each value is an ARRAY of accepted source-column names (aliases). A column
// auto-maps if the uploaded file contains ANY of the listed names. List the
// preferred/canonical name first; add alternatives the file might use. A plain
// string is still accepted (treated as a single-alias array) for compatibility.
const COLUMN_MAPPING = {
  Symbol:           ["NSE Code", "Symbol", "Ticker", "Stock Symbol", "NSE Symbol", "Scrip Code"],
  Description:      ["Name", "Company Name", "Stock Name", "Company", "Issuer Name","Description"],
  Sector:           ["Industry Group", "Sector", "GICS Sector", "Industry Sector", "Broad Sector"],
  Industry:         ["Industry", "Sub Industry", "Industry Sub Group", "Sub-Industry"],
  ROA:              ["Return on assets", "ROA", "Return On Assets", "Return on Assets (%)"],
  ROE:              ["Return on equity", "ROE", "Return On Equity", "Return on Equity (%)"],
  "PAT Growth":     ["Profit growth", "Net profit growth", "PAT Growth", "Profit Growth (%)", "Net Profit Growth (%)", "Earnings Growth"],
  "Debt/Equity":    ["Debt to equity", "D/E Ratio", "Debt/Equity", "Debt to Equity Ratio", "D/E", "Leverage Ratio"],
  "Revenue Growth": ["Sales growth", "Revenue Growth", "Revenue Growth (%)", "Sales Growth (%)", "Turnover Growth", "Income Growth"],
  "EBITDA Margin":  ["OPM", "EBITDA Margin", "Operating Profit Margin", "Operating Margin", "OPM (%)", "EBITDA %"],
  ROCE:             ["Return on capital employed", "ROCE", "Return On Capital Employed", "ROCE (%)", "ROIC"],
  "Quarter Sales":  ["Sales latest quarter", "Quarterly Sales", "Revenue (Q)", "Sales Q", "Net Sales (Q)", "Revenue Latest Quarter"],

  // ── Added from screener snapshot ───────────────────────────────────────────
  "BSE Code":              ["BSE Code", "BSE", "Bombay Stock Exchange Code", "BSE Scrip Code"],
  "ISIN Code":             ["ISIN Code", "ISIN", "ISIN Number", "International Securities Identification Number"],
  "Current Price":         ["Current Price", "CMP", "Price", "LTP", "Last Traded Price", "Stock Price", "Market Price", "Close Price"],
  "P/E Ratio":             ["Price to Earning", "Price to Earnings", "PE Ratio", "P/E", "PE", "Price/Earnings", "P/E Multiple", "Price Earnings Ratio"],
  "Market Cap":            ["Market Capitalization", "Market Cap", "Mkt Cap", "Market Capitalisation", "MCap", "Market Value"],
  "Dividend Yield":        ["Dividend yield", "Dividend Yield", "Div Yield", "DY", "Dividend Yield (%)"],
  "Net Profit (Q)":        ["Net Profit latest quarter", "Net Profit (Q)", "PAT (Q)", "Quarterly Net Profit", "Net Profit Q", "Profit latest quarter"],
  "YOY Profit Growth (Q)": ["YOY Quarterly profit growth", "YOY PAT Growth (Q)", "Quarterly Profit Growth YOY", "Profit Growth QOQ", "YOY Quarterly Profit Growth"],
  "YOY Sales Growth (Q)":  ["YOY Quarterly sales growth", "YOY Revenue Growth (Q)", "Quarterly Sales Growth YOY", "Revenue Growth QOQ", "YOY Quarterly Sales Growth"],
  "PAT":                   ["Profit after tax", "PAT", "Net Profit", "Net Income", "Profit After Tax", "Earnings", "Bottom Line"],
  "Industry PE":           ["Industry PE", "Sector PE", "Industry P/E", "Sector P/E", "Peer PE"],
  "PEG Ratio":             ["PEG Ratio", "PEG", "Price/Earnings to Growth", "Price Earnings Growth Ratio"],
  "PAT Growth 5Y":         ["Profit growth 5Years", "Profit growth 5 Years", "5Y PAT Growth", "5 Year Profit Growth", "Profit CAGR 5Y", "5Yr Profit Growth", "Earnings CAGR 5Y"],
  "P/B Ratio":             ["Price to book value", "Price to Book Value", "P/B", "PB Ratio", "Price/Book", "Price to Book", "PB Multiple"],
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
