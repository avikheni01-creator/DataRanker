# DataRanker — NSE Stock Ranking Pipeline

A tool for scoring and ranking NSE-listed companies by industry-specific KPI templates. Upload a Screener.in export and get back a fully ranked, color-coded Excel report grouped by sector template.

## What it does

1. **Format** — maps raw Screener.in CSV columns to a standardized schema using a configurable column mapping
2. **Map Industries** — joins companies to SCS sectors and KPI templates via a reference mapping workbook
3. **Rank & Score** — scores each company per KPI (rank + percentile slab + weighted metric score), aggregates a total score, and writes one Excel sheet per template

## Architecture

```
DataRanker/
├── src/                        # React frontend (CRA)
│   ├── App.js                  # Router + global state (outputFile, COLUMN_MAPPING)
│   ├── Dashboard.js            # Main upload UI + pipeline runner
│   ├── StockDashboard.jsx      # Results viewer (charts, sortable table)
│   ├── KPILibraryEditor.js     # Edit/export the KPI library (Tier 1)
│   └── components/
│       └── ColumnMapper.jsx    # CSV column → backend metric mapping UI
└── DataRanker_Backend/         # FastAPI backend
    ├── main.py                 # App entry point, CORS config
    ├── api/routes/pipeline.py  # GET /column-mapping, POST /run-pipeline
    ├── core/config.py          # All constants: COLUMN_MAPPING, KPI config, colors
    ├── services/
    │   ├── formatter.py        # Stage 1: CSV → formatted XLSX
    │   ├── mapper.py           # Stage 2: merge industry mapping
    │   └── ranker.py           # Stage 3: score, rank, write output XLSX
    └── utils/file_utils.py     # Upload helpers, temp workspace
```

## Setup

### Backend

```bash
cd DataRanker_Backend
pip install fastapi uvicorn python-multipart pandas openpyxl numpy
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
# from repo root
npm install
npm start        # dev server at http://localhost:3000
```

> **Note:** The frontend calls `http://localhost:8000` by default. If the backend runs on a different host (e.g. a Tailscale IP), update the three fetch URLs in `src/App.js`, `src/Dashboard.js`, and `src/KPILibraryEditor.js`.

## Usage

1. **(Optional) Map columns** — go to `/column-mapper`, upload your Screener.in CSV, confirm or adjust the auto-detected column mapping, then click **Save Mapping**.
2. **Run the pipeline** — on the main page (`/`), upload:
   - **Query Results** — Screener.in `.csv` export
   - **Industry Mapping** — `.xlsx` with an `Industry Mapping` sheet (columns: `190_Industry`, `SCS Sectors`, `Template`, `Economic Model`)
   - **KPI Library** — `.xlsx` with a `Tier1` sheet (header on row 4, columns: `Template`, `KPI`, `Weight %`, `Higher/Lower Better`)
3. Click **Run Full Pipeline** — download `Final_Ranked_Report.xlsx` when done.
4. Click **View Output** to explore results in the interactive dashboard at `/stock-dashboard`.

Other routes: `/kpi-dashboard` — edit the KPI library and export a new XLSX.

## Column mapping

`DataRanker_Backend/core/config.py::COLUMN_MAPPING` defines the default CSV-column → output-column mapping served by `GET /column-mapping`. The frontend ColumnMapper auto-matches incoming CSV headers against these keys (exact, case-insensitive) and lets users fix any gaps before running.

To permanently add or rename a mapping, edit `COLUMN_MAPPING` in `core/config.py`.

## KPI scoring logic

For each KPI in a template:
- `_Rank` — rank within the template group (1 = best; direction-aware)
- `_Percentile_Slab` — percentile bucket in steps of 10 (100 = best, 10 = worst)
- `_Metric_Score` — `Percentile_Slab × (Weight% / 100)`

`Total_Final_Score` = sum of all `_Metric_Score` columns. `Company_Rank` = rank by that score descending.
