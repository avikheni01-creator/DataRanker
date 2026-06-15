# Matrix — Next.js + Express port (under review)

A 1:1 rewrite of the original **DataRanker / Matrix** app (CRA + FastAPI) onto a
full Node stack, kept on a **separate branch** so the team can review it before
it replaces the original. Same UI, same routes, same API endpoints, and the
**same ranking methodology** — verified to produce byte-equivalent output (see
[Parity](#parity-vs-the-python-pipeline)).

- **frontend/** — Next.js 14 (App Router), React 18
- **backend/**  — Express 4 (replaces FastAPI; no Python anywhere)

> ⚠️ The proprietary pipeline (column mapping, 190→130 industry mapping, KPI
> scoring / percentile slabs, ranking) was ported line-for-line from the Python
> services. `LOGIC.md` is **not** part of this repo and must never be added to it.

---

## Prerequisites

- **Node.js ≥ 18** (18 or 20 LTS recommended) and npm.
- That's it — no Python, no system libraries.

## Dependencies

### Backend (`backend/package.json`)
| Package    | Why |
|------------|-----|
| `express`  | HTTP server / routing (replaces FastAPI) |
| `cors`     | Allow the frontend origin (mirrors FastAPI's `CORSMiddleware`, `*`) |
| `multer`   | Parse the multipart upload (the 3 files) on `/run-pipeline` |
| `xlsx` (SheetJS) | Read CSV/XLSX inputs into row objects |
| `exceljs`  | **Write** the final XLSX with cell fills (SheetJS community can't write fills) |

### Frontend (`frontend/package.json`)
| Package         | Why |
|-----------------|-----|
| `next`, `react`, `react-dom` | App Router framework + UI |
| `framer-motion` | Page/transition animations (landing, auth, toast) |
| `recharts`      | Charts on the Results dashboard |
| `xlsx` (SheetJS)| Parse the downloaded report client-side for Results + KPI editor |
| `eslint`, `eslint-config-next` | Lint (dev only) |

Install pulls everything from npm — no manual steps.

---

## Run locally

Two services; **both must be up**. (If only the frontend runs, the Column
Mapper dropdowns are empty and pipeline runs fail to fetch.)

```bash
# 1) Backend  → http://localhost:8000
cd backend
npm install
npm run dev          # node --watch server.js   (or: npm start)

# 2) Frontend → http://localhost:3000
cd frontend
npm install
npm run dev          # (or: npm run build && npm start  for production)
```

Open **http://localhost:3000**.

### Environment variables
| Var | Where | Default | Purpose |
|-----|-------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | `http://localhost:8000` | Backend base URL the frontend calls |
| `PORT` | `backend` env / `.env` | `8000` | Express listen port |

`frontend/.env.local` is git-ignored. Copy from the default above, or set
`NEXT_PUBLIC_API_URL` in your deploy environment. `backend/.env.example` shows
the backend var.

---

## Routes (unchanged from the original)

| Path                  | Page                          |
|-----------------------|-------------------------------|
| `/`                   | Landing (public)              |
| `/login`, `/signup`   | Simulated auth (localStorage; any credentials work) |
| `/app`                | Pipeline (Dashboard)          |
| `/app/column-mapper`  | Column Mapper                 |
| `/app/results`        | Results (StockDashboard)      |
| `/app/kpi-editor`     | KPI Library Editor            |

`/app/*` is gated by `ProtectedRoute`. The lifted pipeline state lives in
`context/AppState` (mounted by `app/app/layout.js`) so uploads survive
navigation — the Next.js equivalent of the old `App.js` state lifting.

## API (Express, identical contract)

- `GET /column-mapping` → canonical `COLUMN_MAPPING` (seeds the Column Mapper)
- `POST /run-pipeline` → multipart `query_results`, `industry_mapping`,
  `kpi_library`, `mapping_json`; returns `Final_Ranked_Report.xlsx`.

Pipeline stages (in `backend/services/`): `formatter` → `mapper` → `ranker`,
with a faithful pandas `Series.rank()` reimplementation in `backend/lib/rank.js`.

---

## How to review the data logic

Start with these three files — they hold the proprietary methodology and are the
highest-value review targets:
- `backend/services/ranker.js` — scoring, percentile slabs, weighting, ranking
- `backend/lib/rank.js` — pandas `rank()` port (tie handling, `pct`, NaN-keep)
- `backend/services/mapper.js` — the 190→130 industry join + column hygiene

## Parity vs. the Python pipeline

The new pipeline was diffed against the original FastAPI/pandas pipeline on the
real sample dataset (`query-results.csv` + mapping + KPI library), same inputs
to both:

- **14 / 14** template sheets, identical set
- **138,084** value cells compared, **0** mismatches
- Cell fills (metric-score `#E6F3FF`, Company_Rank `#C6EFCE`) match

One bug was found and fixed during this check: the KPI-library sheet starts at
row 2, which had shifted the header read off pandas' `header=3` index — see
`backend/lib/io.js` (`readXlsxWithHeader`).

> Re-run parity by feeding the same 3 files + `mapping_json` to both backends
> and comparing the two `Final_Ranked_Report.xlsx` sheet-by-sheet.

---

## Not in this repo (by policy)

`LOGIC.md` (trade-secret methodology), real credentials/secrets, and
`node_modules` are intentionally excluded and git-ignored. Do not add them.
