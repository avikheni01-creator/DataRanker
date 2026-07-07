# Matrix (DataRanker) — Equity Ranking Pipeline

A MERN app for scoring and ranking listed companies by industry-specific KPI templates.
Upload a Screener.in export and get back a fully ranked, colour-coded Excel report grouped
by sector template. UI product name: **Matrix**.

## What it does

1. **Format** — maps raw Screener.in CSV columns to a standardized schema using a configurable mapping
2. **Map Industries** — joins companies to SCS sectors and KPI templates via a reference workbook
3. **Rank & Score** — scores each company per KPI (rank + percentile slab + weighted metric score),
   aggregates a total score, and writes one Excel sheet per template

## Stack

**MERN** — MongoDB · Express · React · Node. The ranking pipeline (originally Python/pandas) is
ported to JavaScript and runs in-memory in the Express backend.

```
DataRanker/
├── client/                     # React frontend (CRA)
│   ├── src/api.js              # API base (REACT_APP_API_URL) + fetch helper
│   ├── src/auth.js            # JWT auth client (httpOnly cookie)
│   ├── src/App.js             # Router + global state
│   ├── src/Dashboard.js       # Upload UI + pipeline runner (2 files; KPIs come from DB)
│   ├── src/StockDashboard.jsx # Results viewer (charts, table)
│   ├── src/KPILibraryEditor.js# Edit/save the per-user KPI library (Tier 1) via API
│   ├── src/theme/             # Design tokens (CSS vars) + light/dark ThemeContext
│   ├── src/pages/             # Landing, Pricing, About, Login, Signup
│   └── src/components/        # AppShell, ColumnMapper, MarketingNav/Footer, ThemeToggle …
└── server/                     # Express + MongoDB backend
    ├── server.js              # Entry: env, DB, CORS, routes
    ├── config/db.js           # Mongoose connection
    ├── models/                # User.js, KpiLibrary.js (per-user Tier 1 KPIs)
    ├── middleware/auth.js     # JWT cookie helpers + requireAuth
    ├── controllers/authController.js
    ├── routes/                # auth.js, plans.js, pipeline.js, kpiLibrary.js
    ├── core/config.js         # COLUMN_MAPPING (aliases), KPI config, output colors
    ├── core/kpiDefaults.js    # Default Tier 1 KPI rows seeded for new users
    ├── core/plans.js          # Subscription tiers (Free / Premium / Enterprise)
    ├── services/              # formatter.js, mapper.js, ranker.js (pipeline) + kpiLibrary.js
    └── lib/                   # rank.js, io.js (pandas-equivalent helpers)
```

## Setup

Prerequisites: **Node.js 18+** and a reachable **MongoDB** (local, or a MongoDB Atlas URI).

### Backend (`server/`)

```bash
cd server
npm install
cp .env.example .env     # then set MONGO_URI and a strong JWT_SECRET
npm start                # http://localhost:8000   (npm run dev for auto-reload)
```

### Frontend (`client/`)

```bash
cd client
npm install
cp .env.example .env     # REACT_APP_API_URL defaults to http://localhost:8000
npm start                # http://localhost:3000
```

> Both services must be running. The backend won't start without a reachable MongoDB.

## Environment

Secrets live in gitignored `.env` files (commit only the `.env.example` templates):

- `server/.env` — `PORT`, `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES`, `CLIENT_ORIGIN`, `NODE_ENV`
- `client/.env` — `REACT_APP_API_URL`

## Auth & subscriptions

- Real signup/login with **JWT stored in an httpOnly cookie** (XSS-resistant). The frontend never
  reads the token; it sends `credentials:'include'` and verifies sessions via `GET /auth/me`.
- Each user has a `plan` (defaults to **Free**). Tiers — **Free / Premium / Enterprise** — are served
  by `GET /plans` and rendered on the Pricing page. Only Free is active today; paid tiers are
  scaffolded ("coming soon") with placeholder prices in `server/core/plans.js`.

## API

| Method | Endpoint          | Auth | Purpose                                   |
|--------|-------------------|------|-------------------------------------------|
| POST   | `/auth/signup`    | —    | Create account (plan=free), set cookie    |
| POST   | `/auth/login`     | —    | Log in, set cookie                        |
| GET    | `/auth/me`        | ✓    | Current user                              |
| POST   | `/auth/logout`    | —    | Clear cookie                              |
| GET    | `/plans`          | —    | Subscription tiers                        |
| GET    | `/column-mapping` | —    | Canonical output→source column mapping (each value is an array of accepted aliases) |
| GET    | `/kpi-library`    | ✓    | Current user's Tier 1 KPIs (seeds defaults on first call) |
| PUT    | `/kpi-library`    | ✓    | Save the user's Tier 1 KPIs               |
| POST   | `/run-pipeline`   | ✓    | Run pipeline (2 uploaded files; KPIs from DB), return `Final_Ranked_Report.xlsx` |

## Usage

1. **(Optional) Map columns** — `/app/column-mapper`: upload your CSV, confirm the auto-detected
   mapping (a column matches any of its configured aliases), save.
2. **Set up KPIs** — `/app/kpi-editor`: every account starts with a default Tier 1 KPI library
   (seeded from the canonical set); edit and **Save** it. No KPI file upload needed.
3. **Run the pipeline** — `/app`: upload Query Results (`.csv`), then **Run Full Pipeline** and download the report. The industry-mapping workbook is bundled with the backend — no second upload needed. Scoring uses your saved KPI library.
4. **Explore** — `/app/results` for the interactive dashboard.

## KPI scoring logic

For each KPI in a template:
- `_Rank` — rank within the template group (1 = best; direction-aware)
- `_Percentile_Slab` — percentile bucket in steps of 10 (100 = best, 10 = worst)
- `_Metric_Score` — `Percentile_Slab × (Weight% / 100)`

`Total_Final_Score` = sum of all `_Metric_Score` columns. `Company_Rank` = rank by that score descending.
