# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This is a **MERN monorepo**: `client/` (React) + `server/` (Express + MongoDB). Both must run.

**Frontend (`client/`):**
```bash
cd client
npm install
npm start        # dev server on localhost:3000
npm test         # jest test runner (interactive watch)
CI=true npm test # non-interactive single run (for CI / one-shot)
npm run build    # production build
```

**Backend (`server/`):**
```bash
cd server
npm install
cp .env.example .env   # then fill MONGO_URI, JWT_SECRET
npm start              # node server.js on localhost:8000 (npm run dev for --watch)
```
Requires a reachable **MongoDB** (local `mongodb://127.0.0.1:27017/matrix` or an Atlas URI).

The backend URL is configured once via `client/.env` → `REACT_APP_API_URL` (consumed in `client/src/api.js`). No more hardcoded URLs.

**Both services must run** — if only the frontend is up, the Column Mapper dropdowns are empty and pipeline runs fail. If MongoDB is down the server won't start.

## Architecture

Two services over HTTP. Product name in the UI is **Matrix**.

### Frontend — `client/` (React 19, React Router, Framer Motion, Recharts, MUI, xlsx)

Routes (in `client/src/App.js`):
```
/                      LandingPage (public, product-led)
/pricing               PricingPage (public; tiers from GET /plans)
/about                 AboutPage (public)
/login, /signup        Login/Signup (public; real JWT auth)
/forgot-password       ForgotPasswordPage
/app                   ProtectedRoute + AppShell wrap all routes below
/app/                  Dashboard.js — the pipeline page
/app/column-mapper     → redirects to /app (mapping is now inline on the pipeline page)
/app/results           StockDashboard
/app/kpi-editor        KPILibraryEditor (always accessible)
/app/screener          ScreenerPage — admin uploads daily snapshot; users filter and run pipeline
/app/comparison        ComparisonPage — pick 2–6 companies from screener data, analytical dashboard
/app/settings          SettingsPage
/app/account           AccountPage
/app/admin/users       AdminUsersPage (admin only)
/app/company/:symbol   CompanyDetailPage — real-time quote, fundamentals, OHLCV chart (Yahoo Finance); opened from StockDashboard company drawer
*                      NotFoundPage (real 404)
```

Key files:
- `src/api.js` — `API_BASE` from `REACT_APP_API_URL` + `apiFetch` helper (always sends `credentials:'include'` so the auth cookie travels)
- `src/seo.js` — per-route `<title>`/`<meta>`/`<link>` components; React 19 hoists them into `<head>` automatically
- `src/auth.js` — real auth: `signUp`/`logIn`/`logOut`/`fetchMe` against `/auth/*`; caches the user object in `localStorage` (the JWT itself is an httpOnly cookie, not readable in JS)
- `src/AppConfigContext.js` — React context for app-wide feature flags; `App.js` fetches `GET /app-config` after auth and stores result here; components consume it via `useContext(AppConfigContext)`
- `src/App.js` — root router; seeds `backendConfig` from `GET /column-mapping`; lifts `outputFile`, `COLUMN_MAPPING`, and the single pipeline upload file (query export)
- `src/Dashboard.js` — pipeline page; POSTs the query export + `mapping_json` to `/run-pipeline`, gets the ranked XLSX back. Neither the KPI library nor the industry-mapping workbook is uploaded — KPIs come from the user's saved set in the DB, and the mapping workbook is bundled with the backend
- `src/KPILibraryEditor.js` — loads the user's Tier 1 KPIs from `GET /kpi-library` (server seeds defaults on first call) and **Save**s via `PUT /kpi-library`. xlsx download/upload kept as optional import/export only
- `pages/ScreenerPage.jsx` — Screener page. Three-layer filtering pipeline:
  1. **DSL filter** (`FIELD OP VALUE AND …`; operators `>/</>=/<==/!=/contains`) → `filteredRows`
  2. **Search bar** (searches columns matching `/name|symbol|ticker/i`; falls back to all columns if none match) → `searchedRows`
  3. **Pagination** (25/50/100/200 rows/page, default 50) → `pagedRows` (table display only)
  - "Run Pipeline" and "Download filtered CSV" operate on `searchedRows` (the full filtered+searched set, not just the current page).
  - Header shows snapshot metadata: row count, upload date, file name.
  - Admin upload panel (shown only when `user.isAdmin`) replaces the singleton snapshot on each upload; triggers a fresh `GET /screener` to reload state.
  - "Run Pipeline" → sends `searchedRows` as JSON to `POST /screener/run-pipeline` → saves XLSX to IndexedDB → navigates to `/app/results`.
  - "Download full data" streams the original uploaded file via `GET /screener/download`.
  - Column mapping is fully server-side via `COLUMN_MAPPING` — no mapping UI on this page.
- `pages/ComparisonPage.jsx` — Company comparison dashboard. Sections: radar (20–100 normalized, top 8 CV metrics), leaderboard (composite rank by metric wins), multi-metric grouped bar (0–100 normalized per metric, toggle chips), single-metric bar, scatter plot (X/Y metric dropdowns, custom dot labels), percentile horizontal bars vs full dataset, raw data table. Radar uses `undefined` (not 0) for missing values so Recharts skips those spokes. Metric selection via `sortByCV` (coefficient of variation). `PALETTE` = 6 colors, `MAX_COMPANIES` = 6.
- `src/StockDashboard.jsx` — Results viewer; parses ranked XLSX from IndexedDB, shows per-template company table with **pagination** (25/50/100/200, default 50), **ordered columns** (Identifiers → Template KPIs → Other data, via `partitionKpiKeys`), column picker with three labelled sections, sort by rank/score/any KPI, search by symbol/name, company drawer with bar chart + radar overlay vs template average. `IDENTIFIER_COLS` (currently `BSE Code`, `ISIN Code`, `NSE Code`) controls which columns are pinned as identifiers — extend this set to add more.
- `components/ProtectedRoute.jsx` — verifies the session via `GET /auth/me`, else redirects to `/login`
- `components/AppShell.jsx` — app sidebar/topbar; NAV includes Pipeline, Screener, Results, KPI Editor
- `components/MarketingNav.jsx` / `MarketingFooter.jsx` — shared chrome for the public pages
- `components/Toast.jsx` — app-wide notification banner; triggered via the `notify` callback lifted in `App.js`
- `components/ThemeToggle.jsx` + `theme/ThemeContext.jsx` — light/dark mode, persisted to `localStorage`, applied via `<html data-theme>`
- `theme/index.js` — **design-system tokens as CSS variables** (`var(--x)`); concrete light/dark values live in `index.css`. Flipping `data-theme` re-themes the whole app. Brand (`#7C6CFF→#4F46E5`) + semantic colors are shared by both modes. `StockDashboard.jsx` and `KPILibraryEditor.js` still have some hardcoded hex inline — convert to `var(--…)` if you need them fully theme-reactive.
- `index.css` — font imports, the `:root[data-theme=...]` token palettes, and the global ambient backdrop

Deployment plumbing: `client/vercel.json` + `client/public/_redirects` provide the SPA deep-link fallback. Backend deploys separately and needs MongoDB Atlas for a shareable URL.

### Backend — `server/` (Express, MongoDB/Mongoose, JWT)

- `server.js` — loads env, connects MongoDB (`config/db.js`), credentialed CORS (`CLIENT_ORIGIN`), mounts routers; `express.json` limit is **10 MB** (raised from default for `/screener/run-pipeline` JSON body)
- `config/db.js` — Mongoose connection helper; called once at startup
- `routes/auth.js` + `controllers/authController.js` — `POST /auth/signup|login|logout`, `GET /auth/me`. Sets/clears the httpOnly JWT cookie via `middleware/auth.js`
- `middleware/auth.js` — `signToken`, cookie helpers, `requireAuth` (guards most app routes), and `requireAdmin` (chains after `requireAuth`; checks `req.user.isAdmin`)
- `models/User.js` — `{ name, email, passwordHash, plan, isAdmin }`; bcrypt hashing; `plan` defaults to `free`, `isAdmin` defaults to `false`. `toSafeJSON()` exposes `isAdmin` to the frontend.
- `models/KpiLibrary.js` — per-user Tier 1 KPI library `{ userId (unique), name, rows:[{template,kpi,category,weight,direction}] }`; replaces the uploaded KPI Excel
- `models/ScreenerSnapshot.js` — singleton document (deleteMany+create on each admin upload): `{ uploadedAt, uploadedBy, fileName, filePath, rawMimeType, columns:[String], rows:[Mixed] }`. The original file is stored on **server disk** at `server/uploads/screener-snapshot.<ext>`; `filePath` is the absolute path. Download endpoint streams it via `fs.createReadStream`. Old file is deleted from disk before each replacement.
- `routes/plans.js` + `core/plans.js` — `GET /plans`; tiers **Free / Premium / Enterprise** (only Free active)
- `routes/kpiLibrary.js` + `services/kpiLibrary.js` — `GET /kpi-library` (lazy-seeds defaults from `core/kpiDefaults.js`) and `PUT /kpi-library` (validated save). `toRankerRows` adapts stored rows into the keys the ranker reads
- `routes/pipeline.js` — `GET /column-mapping` (public) and `POST /run-pipeline` (auth-gated, single `query_results` upload, 15 MB limit); validates `mapping_json` presence and JSON array shape before parsing (returns clean 400 on failure)
- `routes/screener.js` — 4 endpoints (all auth-gated):
  - `POST /admin/screener` (+ `requireAdmin`) — multer upload (25 MB max), parses CSV/XLSX, deletes old `server/uploads/` file, writes new file to disk, stores singleton `ScreenerSnapshot`
  - `GET /screener` — returns `{ columns, rows, uploadedAt, fileName }` (no raw file data)
  - `GET /screener/download` — streams original file via `fs.createReadStream(snap.filePath)`
  - `POST /screener/run-pipeline` — accepts `{ rows }` JSON body, auto-maps columns via `COLUMN_MAPPING` aliases, runs the full 3-stage pipeline, returns ranked XLSX
- `scripts/makeAdmin.js` — one-time CLI: `node scripts/makeAdmin.js <email>` sets `isAdmin: true`. Run from `server/` directory with a valid `.env`.
- `services/industryMapping.js` — loads + caches the bundled `server/data/industry-mapping.xlsx` (the canonical 190→130 mapping) and hands its buffer to the mapper. Replaces the per-run mapping upload; keeps the proprietary mapping server-side only
- `services/formatter.js`, `services/mapper.js`, `services/ranker.js` + `lib/rank.js`, `lib/io.js` — the **ported pipeline** (Stage 1 format → Stage 2 industry map → Stage 3 direction-aware percentile ranking). Protected core logic. `runRanking(mapped, kpiRows)` takes parsed rows; `runRankingFromBuffer` keeps the legacy xlsx path (scoring math unchanged)
- `core/config.js` — `COLUMN_MAPPING` (served to the frontend; each value is an **array of accepted source-column aliases**), `EXTRA_COLUMNS`, drop columns, KPI sheet coordinates, output cell colors
- `core/kpiDefaults.js` — `DEFAULT_TIER1_ROWS`, generated from `files/KPI_Library.xlsx` (70 rows / 14 templates); seeded for every new user

## Key config

`server/core/config.js` — pipeline config (single source of truth):
- `COLUMN_MAPPING` — output column name → **array of accepted source-column aliases**. Now covers all 26 screener.in columns with common name variants per entry. Served to the frontend via `GET /column-mapping`; a column auto-maps if the file contains any listed alias. Plain strings still accepted for back-compat.
- `EXTRA_COLUMNS` — empty placeholder columns added in Stage 1 (only add if a later stage fills them)
- `MAPPER_DROP_COLUMNS` — columns dropped after the Stage 2 merge
- `KPI_SHEET_NAME`, `KPI_HEADER_ROW` — KPI library sheet coordinates (legacy xlsx import path only)
- Excel cell fill colors for the ranked output

`server/core/kpiDefaults.js` — `DEFAULT_TIER1_ROWS`, the default per-user KPI library (regenerate from `files/KPI_Library.xlsx` if the canonical set changes). New users are seeded from this; the pipeline reads each user's saved rows from MongoDB instead of an uploaded sheet.

`server/core/plans.js` — subscription tiers (placeholder prices). `server/.env` / `client/.env` hold secrets (gitignored; see the `.env.example` files).

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
