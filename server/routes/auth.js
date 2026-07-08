// routes/auth.js — mounted at /auth.

const express = require("express");
const { signup, login, me, logout, googleAuth } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { rateLimit } = require("../middleware/rateLimit");

const router = express.Router();

// Throttle credential endpoints to slow brute-force / abuse. /me and /logout
// are intentionally left unlimited.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many authentication attempts, please try again later.",
});

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/google", authLimiter, googleAuth);
router.get("/me", requireAuth, me);
router.post("/logout", logout);

module.exports = router;
