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

## Current state (2026-06-17)

- Migrated from **CRA React + Python/FastAPI** to a **MERN stack**: React frontend (`client/`) + Express/MongoDB backend (`server/`). The data-ranking pipeline (format → map → rank) was ported from Python to JavaScript and verified byte-equivalent (origin: the `dataranker/` reference repo, gitignored).
- Added: **JWT auth** (httpOnly cookie) backed by MongoDB, **subscription plans** (Free default; Premium/Enterprise scaffolded as "coming soon"), an app-wide **light/dark theme toggle**, a redesigned **product-led landing page**, and **Pricing** + **About** pages.
- **DB-backed KPI library** — the per-run KPI Excel upload is gone. Each user has a Tier 1 KPI library in MongoDB (`models/KpiLibrary`), seeded from `core/kpiDefaults.js` (70 rows / 14 templates, generated from `files/KPI_Library.xlsx`) and editable in the KPI Editor. Pipeline now uploads **only the query export**; the industry-mapping workbook is bundled with the backend (`server/data/industry-mapping.xlsx`, served via `services/industryMapping.js`) and never leaves the server. See `GET/PUT /kpi-library`.
- **Column-mapping aliases** — `COLUMN_MAPPING` values are arrays of accepted source-column names; the frontend auto-mapper matches any alias.
- **Tier-1 deployment-readiness pass (2026-06-17)** — production build now passes under `CI=true` (was failing on lint-as-error); server fail-fasts without `JWT_SECRET` and warns when `NODE_ENV!=production`; security headers + auth rate-limiting (`middleware/rateLimit.js`, dependency-free) + 15 MB upload cap; real HTML `<title>`/description + `noindex` (prototype) + `robots.txt` disallow; `npm test` fixed. Hosting decision: **separate domains, accept third-party-cookie risk** (Safari/strict-Chrome may block the cross-site auth cookie) — documented in `server/.env.example`. **Not deployed yet** — only made deploy-ready.
- **Results persistence** — the ranked XLSX is saved to IndexedDB (`client/src/lib/resultStore.js`) on each run; `StockDashboard` hydrates it on refresh/deep-link and it's cleared on logout. **Company comparison chart** — the Results company drawer now has a recharts **radar overlay** (company vs template average across KPI metric-scores).
- Branch: **`feat/mern-stack-auth-theme`**, merged to **`main`** (origin only; not pushed to `upstream`). Latest work committed.
- **Single pipeline page** — Column Mapper is no longer a separate route. It's an inline, collapsible step on the pipeline page (`/app`): upload once → review/auto-map columns (collapsible auto-mapped & unmapped `<details>` sections) → Run. The `/app/column-mapper` route now redirects to `/app`. Run is gated on a built mapping (fixes a prior empty-mapping 500).
- **SEO** — site is publicly indexable. Per-route metadata via React 19 native hoisting (`client/src/seo.js`); Open Graph/Twitter/JSON-LD + real title/description in `index.html`; `robots.txt` allows crawl (only `/app` disallowed) + `sitemap.xml`. Set `REACT_APP_SITE_URL` and replace the `matrix.example.com` placeholder in `robots.txt`/`sitemap.xml` at deploy.
- Three known core-logic bugs remain frozen pending team approval (carried over from the Python pipeline; see Claude's memory notes). Do not touch without Romit's approval.
- **Pending: UI deployment-readiness fixes** — a 4-agent UI audit (2026-06-17) found ~40 issues (3 blockers, ~12 high) spanning stale marketing copy, `$`→₹ pricing, light-mode contrast (hardcoded hex vs tokens), mobile nav/breakpoints, keyboard a11y, FOUC, real 404, ColumnMapper manual-mapping inversion + disabled validation, faked pipeline progress. See memory `ui-deploy-audit`. Awaiting go-ahead to implement (all frontend, no core logic).

## Architecture

Two services over HTTP. Product name in the UI is **Matrix**.

### Frontend — `client/` (React 19, React Router, Framer Motion, Recharts, xlsx)

Routes (in `client/src/App.js`):
```
/                   LandingPage (public, product-led)
/pricing            PricingPage (public; tiers from GET /plans)
/about              AboutPage (public, dummy copy)
/login, /signup     Login/Signup (public; real JWT auth)
/app                ProtectedRoute + AppShell wrap all routes below
/app/               Dashboard.js — the pipeline page
/app/column-mapper  → redirects to /app (mapping is now inline on the pipeline page)
/app/results        StockDashboard
/app/kpi-editor     KPILibraryEditor (always accessible)
```

Key files:
- `src/api.js` — `API_BASE` from `REACT_APP_API_URL` + `apiFetch` helper (always sends `credentials:'include'` so the auth cookie travels)
- `src/auth.js` — real auth: `signUp`/`logIn`/`logOut`/`fetchMe` against `/auth/*`; caches the user object in `localStorage` (the JWT itself is an httpOnly cookie, not readable in JS)
- `src/App.js` — root router; seeds `backendConfig` from `GET /column-mapping`; lifts `outputFile`, `COLUMN_MAPPING`, and the single pipeline upload file (query export)
- `src/Dashboard.js` — pipeline page; POSTs the query export + `mapping_json` to `/run-pipeline`, gets the ranked XLSX back. Neither the KPI library nor the industry-mapping workbook is uploaded — KPIs come from the user's saved set in the DB, and the mapping workbook is bundled with the backend
- `src/KPILibraryEditor.js` — loads the user's Tier 1 KPIs from `GET /kpi-library` (server seeds defaults on first call) and **Save**s via `PUT /kpi-library`. xlsx download/upload kept as optional import/export only
- `components/ProtectedRoute.jsx` — verifies the session via `GET /auth/me`, else redirects to `/login`
- `components/AppShell.jsx` — app sidebar/topbar; hosts the user menu, sign-out, and theme toggle
- `components/MarketingNav.jsx` / `MarketingFooter.jsx` — shared chrome for the public pages
- `components/ThemeToggle.jsx` + `theme/ThemeContext.jsx` — light/dark mode, persisted to `localStorage`, applied via `<html data-theme>`
- `theme/index.js` — **design-system tokens as CSS variables** (`var(--x)`); concrete light/dark values live in `index.css`. Flipping `data-theme` re-themes the whole app. Brand (`#7C6CFF→#4F46E5`) + semantic colors are shared by both modes. `StockDashboard.jsx` and `KPILibraryEditor.js` still have some hardcoded hex inline — convert to `var(--…)` if you need them fully theme-reactive.
- `index.css` — font imports, the `:root[data-theme=...]` token palettes, and the global ambient backdrop

Deployment plumbing: `client/vercel.json` + `client/public/_redirects` provide the SPA deep-link fallback. Backend deploys separately and needs MongoDB Atlas for a shareable URL.

### Backend — `server/` (Express, MongoDB/Mongoose, JWT)

- `server.js` — loads env, connects MongoDB (`config/db.js`), credentialed CORS (`CLIENT_ORIGIN`), mounts routers
- `routes/auth.js` + `controllers/authController.js` — `POST /auth/signup|login|logout`, `GET /auth/me`. Sets/clears the httpOnly JWT cookie via `middleware/auth.js`
- `middleware/auth.js` — `signToken`, cookie helpers, and `requireAuth` (guards `POST /run-pipeline`, `GET/PUT /kpi-library`)
- `models/User.js` — `{ name, email, passwordHash, plan }`; bcrypt hashing; `plan` defaults to `free`
- `models/KpiLibrary.js` — per-user Tier 1 KPI library `{ userId (unique), name, rows:[{template,kpi,category,weight,direction}] }`; replaces the uploaded KPI Excel
- `routes/plans.js` + `core/plans.js` — `GET /plans`; tiers **Free / Premium / Enterprise** (only Free active)
- `routes/kpiLibrary.js` + `services/kpiLibrary.js` — `GET /kpi-library` (lazy-seeds defaults from `core/kpiDefaults.js`) and `PUT /kpi-library` (validated save). `toRankerRows` adapts stored rows into the keys the ranker reads
- `routes/pipeline.js` — `GET /column-mapping` (public) and `POST /run-pipeline` (auth-gated, single `query_results` upload, 15 MB limit); runs the 3 stages in-memory. Pulls the signed-in user's KPI library from the DB (no KPI upload) and the industry-mapping workbook from `services/industryMapping.js` (no mapping upload)
- `services/industryMapping.js` — loads + caches the bundled `server/data/industry-mapping.xlsx` (the canonical 190→130 mapping) and hands its buffer to the mapper. Replaces the per-run mapping upload; keeps the proprietary mapping server-side only
- `services/formatter.js`, `services/mapper.js`, `services/ranker.js` + `lib/rank.js`, `lib/io.js` — the **ported pipeline** (Stage 1 format → Stage 2 industry map → Stage 3 direction-aware percentile ranking). Protected core logic. `runRanking(mapped, kpiRows)` takes parsed rows; `runRankingFromBuffer` keeps the legacy xlsx path (scoring math unchanged)
- `core/config.js` — `COLUMN_MAPPING` (served to the frontend; each value is an **array of accepted source-column aliases**), `EXTRA_COLUMNS`, drop columns, KPI sheet coordinates, output cell colors
- `core/kpiDefaults.js` — `DEFAULT_TIER1_ROWS`, generated from `files/KPI_Library.xlsx` (70 rows / 14 templates); seeded for every new user

## Key config

`server/core/config.js` — pipeline config (single source of truth):
- `COLUMN_MAPPING` — output Excel column name → **array of accepted source-column aliases** (served to the frontend; a column auto-maps if the file contains any alias). Plain strings still accepted for back-compat
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
