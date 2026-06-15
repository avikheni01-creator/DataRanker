# Matrix — Next.js + Express port (under review)

A 1:1 rewrite of the original CRA + FastAPI **DataRanker / Matrix** app onto a full
Node stack, kept in a separate repo so it can be reviewed before replacing the
original. Same UI, same routes, same API endpoints, same ranking methodology.

- **frontend/** — Next.js 14 (App Router), React 18, Framer Motion, Recharts, SheetJS
- **backend/** — Express, Multer, SheetJS (read) + ExcelJS (styled write)

> The proprietary pipeline (column mapping, 190→130 industry mapping, KPI
> scoring / percentile slabs, ranking) was ported line-for-line from the Python
> services. `LOGIC.md` is **not** part of this repo and must never be copied in.

## Run locally

Two services, both must be up.

```bash
# 1) Backend  (http://localhost:8000)
cd backend
npm install
npm run dev        # node --watch server.js

# 2) Frontend (http://localhost:3000)
cd frontend
npm install
npm run dev
```

The frontend reads the backend URL from `NEXT_PUBLIC_API_URL`
(`frontend/.env.local`, defaults to `http://localhost:8000`).

## Routes (unchanged from the original)

| Path                  | Page                          |
|-----------------------|-------------------------------|
| `/`                   | Landing (public)              |
| `/login`, `/signup`   | Simulated auth (localStorage) |
| `/app`                | Pipeline (Dashboard)          |
| `/app/column-mapper`  | Column Mapper                 |
| `/app/results`        | Results (StockDashboard)      |
| `/app/kpi-editor`     | KPI Library Editor            |

`/app/*` is gated by `ProtectedRoute`; the lifted pipeline state lives in
`context/AppState` (mounted by `app/app/layout.js`) so uploads survive
navigation — the Next.js equivalent of the old `App.js` state lifting.

## API (Express, identical contract)

- `GET /column-mapping` → canonical `COLUMN_MAPPING` (seeds the Column Mapper)
- `POST /run-pipeline` → multipart `query_results`, `industry_mapping`,
  `kpi_library`, `mapping_json`; returns `Final_Ranked_Report.xlsx`

## Parity / verification status

- [x] Frontend pages ported (Landing, auth, Dashboard, ColumnMapper,
      StockDashboard, KPI Editor)
- [x] Backend pipeline ported (formatter → mapper → ranker) with a faithful
      pandas `Series.rank()` reimplementation (`lib/rank.js`)
- [ ] **Output diff vs. the Python pipeline on a real dataset** — pending; this
      is the one step that proves the ranking math is byte-equivalent.
