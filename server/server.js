// server.js — Express app entry.
// Loads env, connects to MongoDB, configures credentialed CORS (httpOnly-cookie
// auth), and mounts the auth, plans, and pipeline routers.

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");
const authRouter = require("./routes/auth");
const plansRouter = require("./routes/plans");
const pipelineRouter = require("./routes/pipeline");

const app = express();

// Credentialed CORS: the browser must be allowed to send the auth cookie, which
// requires an explicit origin (not "*"). CLIENT_ORIGIN is a comma-separated list.
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
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

app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use(plansRouter); // GET /plans
app.use(pipelineRouter); // GET /column-mapping, POST /run-pipeline

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
