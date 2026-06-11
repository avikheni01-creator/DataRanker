# core/config.py — App-wide constants and column mappings

# Column mapping from query CSV → output Excel (Stage 1)
COLUMN_MAPPING: dict[str, str] = {
    "Symbol": "NSE Code",
    "Description": "Name",
    "Sector": "Industry Group",
    "Industry": "Industry",
    "ROA": "Return on assets",
    "ROE": "Return on equity",
    "PAT Growth": "Profit growth",
    "Debt/Equity": "Debt to equity",
    "Revenue Growth": "Sales growth",
    "EBITDA Margin": "OPM",
    "ROCE": "Return on capital employed",
    "Quarter Sales" : "Sales latest quarter",
    "test_Column": "test_Column_input",    
}

# Columns added as empty placeholders (Stage 1)
# NOTE: Only list columns that will actually be populated later in the pipeline.
# Do NOT pre-create KPI columns that don't exist in the source data — the ranker
# checks `if kpi in subset.columns` which will be True for these empty cols and
# produce all-NaN _Rank / _Percentile_Slab / _Metric_Score columns in the output.
EXTRA_COLUMNS: list[str] = [
    "Exchange",
    # Add columns here only if a later pipeline stage will fill them with real data.
]

# Columns to drop after industry mapping merge (Stage 2)
MAPPER_DROP_COLUMNS: list[str] = [
    "190_Industry",
    "Industry_y",
    "Sectors",
    "SCS Sectors",
    "Economic Model",
    "Template",
]

# Excel cell fill colors (Stage 3)
METRIC_SCORE_COLOR = "E6F3FF"
RANK_COLOR = "C6EFCE"

# KPI library sheet + header row (Stage 3)
KPI_SHEET_NAME = "Tier1"
KPI_HEADER_ROW = 3  # 0-indexed; openpyxl header=3 means row 4 is the header
