// server.js - Express app entry.
// Loads env, connects to MongoDB, configures credentialed CORS (httpOnly-cookie
// auth), and mounts the auth, plans, and pipeline routers.

require("dotenv").config();

// Fail-fast on missing secrets: the app must never run without a JWT secret.
if (!process.env.JWT_SECRET) {
  console.error(
    "FATAL: JWT_SECRET is not set. Refusing to start. " +
      "Set JWT_SECRET in your environment (see .env.example)."
  );
  process.exit(1);
}

// In non-production, auth cookies are not Secure / SameSite=None, so cross-site
// login only works over http/localhost. Warn once (not fatal).
if (process.env.NODE_ENV !== "production") {
  console.warn(
    "WARNING: NODE_ENV is not 'production'. Auth cookies are NOT Secure / " +
      "SameSite=None - cross-site login will only work over http/localhost."
  );
}

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

const connectDB = require("./config/db");
const authRouter = require("./routes/auth");
const plansRouter = require("./routes/plans");
const pipelineRouter = require("./routes/pipeline");
const kpiLibraryRouter = require("./routes/kpiLibrary");
const screenerRouter = require("./routes/screener");
const adminSettingsRouter = require("./routes/adminSettings");
const adminUsersRouter = require("./routes/adminUsers");
const adminPlansRouter = require("./routes/adminPlans");
const adminLogsRouter  = require("./routes/adminLogs");
require("./models/AdminLog"); // ensure model is registered
const paymentRouter    = require("./routes/payment");
const statsRouter = require("./routes/stats");
const resultsRouter = require("./routes/results");
const companyRouter = require("./routes/company");

const app = express();

// Credentialed CORS: the browser must be allowed to send the auth cookie, which
// requires an explicit origin (not "*"). CLIENT_ORIGIN is a comma-separated list.
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin / curl (no Origin header) and any whitelisted origin.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled - API-only server, no HTML served

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use(plansRouter); // GET /plans
app.use(pipelineRouter); // GET /column-mapping, POST /run-pipeline
app.use(kpiLibraryRouter); // GET/PUT /kpi-library
app.use(screenerRouter);        // GET/POST /screener, POST /admin/screener
app.use(adminSettingsRouter);  // GET /app-config, GET/PUT /admin/settings
app.use(adminUsersRouter);     // GET/PATCH/DELETE /admin/users
app.use(adminPlansRouter);    // GET/POST/PUT/DELETE /admin/plans
app.use(adminLogsRouter);     // GET /admin/logs
app.use(paymentRouter);       // POST /payment/create-order, POST /payment/verify
app.use(statsRouter);          // GET /stats (public)
app.use(resultsRouter);        // POST /results/email
app.use(companyRouter);       // GET /company/:symbol, /summary, /history

const PORT = process.env.PORT || 8000;

// Connect to MongoDB, then start listening.
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Matrix API listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });

module.exports = app;
