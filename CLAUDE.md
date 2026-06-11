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
The backend URL defaults to `http://localhost:8000`. It appears in three files: `src/App.js`, `src/Dashboard.js`, `src/KPILibraryEditor.js`. Change all three if the backend moves to a different host (planned: replace with a `REACT_APP_API_URL` env var for deployment).

**Both services must run** — if only the frontend is up, the Column Mapper dropdowns are empty and pipeline runs fail with "Failed to fetch".

## Current state (2026-06-11)

- Branch **`frontend-redesign-v2`** holds the full Matrix redesign (commit `3bdd858`), intentionally unmerged so it can be revised before merging to `main`.
- Three known core-logic bugs are frozen pending team approval (mapping direction flipped between `buildFinalMapping()` and `formatter.py`; `mapping_json` declared `File(...)` instead of `Form(...)`; Tier 2 KPIs missing from `COLUMN_MAPPING`). Details and roadmap live in Claude's memory notes for this project.
- Remaining eslint warnings (`Tier2Card`, `loading`, exhaustive-deps, `unmappedStillPending`) sit inside protected logic and are intentionally left alone.

## Architecture

Two independent services that communicate over HTTP:

**Frontend** (`src/`) — React 19, React Router, Framer Motion, Recharts, xlsx. Product name in the UI is **Matrix**.

Routes (defined in `App.js`):
```
/                   LandingPage (public)
/login, /signup     Login/Signup (public, UI-only auth — localStorage flag, no real credentials)
/app                ProtectedRoute + AppShell (sidebar) wrap all routes below
/app/               Dashboard.js — the pipeline page
/app/column-mapper  ColumnMapper
/app/results        StockDashboard
/app/kpi-editor     KPILibraryEditor (gated: only reachable once a KPI file is uploaded)
```

Key files:
- `App.js` — root router; fetches `GET /column-mapping` on mount (with retry + toast on failure) to seed `backendConfig`; owns `outputFile`, `COLUMN_MAPPING`, and the three pipeline upload files (`queryFile`/`mappingFile`/`kpiFile` are lifted here so they survive route changes; `kpiFile` also gates the KPI editor)
- `Dashboard.js` — pipeline page; collects 3 file uploads (query CSV, industry-mapping XLSX, KPI library XLSX) and a `mapping_json` param, then POSTs to `/run-pipeline` and receives the ranked XLSX back (`usePipeline` hook)
- `components/ColumnMapper.jsx` — lets users upload a CSV/XLSX, auto-maps columns (exact case-insensitive match) against `backendConfig`, and lets users manually map the rest; calls `setCOLUMN_MAPPING` so `Dashboard.js` knows the final mapping
- `StockDashboard.jsx` — reads the downloaded output XLSX (via `xlsx`) and renders charts/tables; shows an empty state until a pipeline run produces `outputFile`
- `KPILibraryEditor.js` — editor for the KPI library file (Tier1 editable, Tier2 commented out pending column-mapping support)
- `components/AppShell.jsx` — sidebar layout for `/app/*`; `components/ProtectedRoute.jsx` + `auth.js` — the simulated auth
- `theme/index.js` — **single source of truth for the design system** ("Premium Fintech Dark": `#050810` canvas, `#7C6CFF→#4F46E5` gradient accent, glass surfaces via the exported `glassCss`, fonts: Space Grotesk display / Inter UI / JetBrains Mono data). Change palette/typography here first; `StockDashboard.jsx` and `KPILibraryEditor.js` still use matching hardcoded hex values inline — keep them in sync if tokens change.
- `index.css` — font imports and the global ambient backdrop (`body::before`)

Deployment plumbing: `vercel.json` + `public/_redirects` provide the SPA deep-link fallback.

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

---

## Project rules (MUST follow in every session)

### Team context
Three members: IT developer (repo creator), CA analyst at hedge fund (non-technical reviewer), and Romit (owner of this Claude instance, product lead). The CA member reviews the software periodically but has no IT setup.

### Core logic — protected
The business logic (column mapping pipeline, 190-to-130 industry mapping, KPI scoring/weighting, ranking methodology) is proprietary. **Never change core logic without explicit permission from Romit.** If a task would require touching the logic, stop and ask first.

### Trade secret file — LOGIC.md
`LOGIC.md` lives in the project root. It documents the full business logic and methodology. Rules:
- **Never commit, push, or make it public by any means.**
- It is `.gitignored` — verify this before any git operation.
- Only Romit reads/edits it. It will be improved over time as the logic evolves.

### Documentation discipline
Document everything as the project grows (for future IT members or other joiners). Keep inline comments minimal but maintain accurate architecture notes in this file and in `LOGIC.md`. No auto-generated docs or README bloat — everything meaningful goes in CLAUDE.md or LOGIC.md.

### Deployment / prototype access
The CA hedge fund reviewer must be able to access the prototype via a browser URL only — no local installs. Always maintain a cloud-deployable setup so a URL can be shared with non-IT members. See `LOGIC.md` for deployment notes.
