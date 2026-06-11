# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Frontend (React, root directory):**
```bash
npm start        # dev server on localhost:3000
npm test         # jest test runner (interactive watch)
npm run build    # production build
```

**Backend (FastAPI, `DataRanker_Backend/`):**
```bash
cd DataRanker_Backend
uvicorn main:app --reload --port 8000
```
The backend URL defaults to `http://localhost:8000`. It appears in three files: `src/App.js`, `src/Dashboard.js`, `src/KPILibraryEditor.js`. Change all three if the backend moves to a different host.

## Architecture

Two independent services that communicate over HTTP:

**Frontend** (`src/`) — React 19, MUI, React Router, Recharts, xlsx:
- `App.js` — root router; fetches `GET /column-mapping` on mount to seed `backendConfig`; owns `outputFile` and `COLUMN_MAPPING` state that child routes share
- `Dashboard.js` — main upload UI; collects 3 file uploads (query CSV, industry-mapping XLSX, KPI library XLSX) and a `mapping_json` param, then POSTs to `/run-pipeline` and receives the ranked XLSX back
- `components/ColumnMapper.jsx` — lets users upload a CSV, auto-maps columns (exact case-insensitive match) against `backendConfig`, and lets users manually map the rest; calls `setCOLUMN_MAPPING` so `Dashboard.js` knows the final mapping
- `StockDashboard.jsx` — reads the downloaded output XLSX (via `xlsx`) and renders charts/tables
- `KPILibraryEditor.js` — standalone editor for the KPI library file

**Backend** (`DataRanker_Backend/`) — FastAPI, pandas, openpyxl:

Three-stage pipeline exposed via `POST /run-pipeline`:
1. **Stage 1 — Format** (`services/formatter.py`): reads raw Screener.in CSV, applies user-supplied `dynamic_mapping` (CSV column → output column), writes `Formatted_Data.xlsx`
2. **Stage 2 — Map** (`services/mapper.py`): merges formatted data with industry-mapping workbook on `Industry` / `190_Industry`; attaches `SCS Sectors`, `Template`, `Economic Model`; writes CSV
3. **Stage 3 — Rank** (`services/ranker.py`): reads KPI library (`Tier1` sheet, header row 4), scores and ranks each company per KPI with direction-aware percentile slabs and weighted metric scores; writes `Final_Ranked_Report.xlsx`

`GET /column-mapping` returns `core/config.py::COLUMN_MAPPING` — the canonical mapping that the ColumnMapper auto-maps against.

## Key config

`DataRanker_Backend/core/config.py` is the single source of truth for:
- `COLUMN_MAPPING` — CSV source column → output Excel column name (also served to the frontend)
- `EXTRA_COLUMNS` — empty placeholder columns added in Stage 1 (only add if a later stage fills them)
- `MAPPER_DROP_COLUMNS` — columns dropped after the Stage 2 merge
- `KPI_SHEET_NAME`, `KPI_HEADER_ROW` — KPI library sheet coordinates
- Excel cell fill colors for the ranked output
