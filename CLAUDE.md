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

## Current state (2026-06-15)

- Migrated from **CRA React + Python/FastAPI** to a **MERN stack**: React frontend (`client/`) + Express/MongoDB backend (`server/`). The data-ranking pipeline (format → map → rank) was ported from Python to JavaScript and verified byte-equivalent (origin: the `dataranker/` reference repo, gitignored).
- Added: **JWT auth** (httpOnly cookie) backed by MongoDB, **subscription plans** (Free default; Premium/Enterprise scaffolded as "coming soon"), an app-wide **light/dark theme toggle**, a redesigned **product-led landing page**, and **Pricing** + **About** pages.
- Branch: **`frontend-redesign-v2`**.
- Three known core-logic bugs remain frozen pending team approval (carried over from the Python pipeline; see Claude's memory notes). Do not touch without Romit's approval.

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
/app/column-mapper  ColumnMapper
/app/results        StockDashboard
/app/kpi-editor     KPILibraryEditor (always accessible)
```

Key files:
- `src/api.js` — `API_BASE` from `REACT_APP_API_URL` + `apiFetch` helper (always sends `credentials:'include'` so the auth cookie travels)
- `src/auth.js` — real auth: `signUp`/`logIn`/`logOut`/`fetchMe` against `/auth/*`; caches the user object in `localStorage` (the JWT itself is an httpOnly cookie, not readable in JS)
- `src/App.js` — root router; seeds `backendConfig` from `GET /column-mapping`; lifts `outputFile`, `COLUMN_MAPPING`, and the three pipeline upload files
- `src/Dashboard.js` — pipeline page; POSTs 3 files + `mapping_json` to `/run-pipeline`, gets the ranked XLSX back
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
- `middleware/auth.js` — `signToken`, cookie helpers, and `requireAuth` (guards `POST /run-pipeline`)
- `models/User.js` — `{ name, email, passwordHash, plan }`; bcrypt hashing; `plan` defaults to `free`
- `routes/plans.js` + `core/plans.js` — `GET /plans`; tiers **Free / Premium / Enterprise** (only Free active)
- `routes/pipeline.js` — `GET /column-mapping` (public) and `POST /run-pipeline` (auth-gated); runs the 3 stages in-memory
- `services/formatter.js`, `services/mapper.js`, `services/ranker.js` + `lib/rank.js`, `lib/io.js` — the **ported pipeline** (Stage 1 format → Stage 2 industry map → Stage 3 direction-aware percentile ranking). Protected core logic.
- `core/config.js` — `COLUMN_MAPPING` (served to the frontend), `EXTRA_COLUMNS`, drop columns, KPI sheet coordinates, output cell colors

## Key config

`server/core/config.js` — pipeline config (single source of truth):
- `COLUMN_MAPPING` — CSV source column → output Excel column name (also served to the frontend)
- `EXTRA_COLUMNS` — empty placeholder columns added in Stage 1 (only add if a later stage fills them)
- `MAPPER_DROP_COLUMNS` — columns dropped after the Stage 2 merge
- `KPI_SHEET_NAME`, `KPI_HEADER_ROW` — KPI library sheet coordinates
- Excel cell fill colors for the ranked output

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
