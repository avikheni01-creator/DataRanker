// routes/auth.js — mounted at /auth.

const express = require("express");
const {
  signup, login, me, logout, googleAuth,
  forgotPassword, resetPassword, requestOtp, changePassword, updateProfile,
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { rateLimit } = require("../middleware/rateLimit");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many authentication attempts, please try again later.",
});

// OTP endpoints get a tighter limit to slow abuse (10 per 15 min).
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many code requests, please wait before trying again.",
});

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/google", authLimiter, googleAuth);
router.get("/me", requireAuth, me);
router.post("/logout", logout);

// Password reset (unauthenticated)
router.post("/forgot-password", otpLimiter, forgotPassword);
router.post("/reset-password", otpLimiter, resetPassword);

// Password change + profile (authenticated)
router.post("/request-otp", requireAuth, otpLimiter, requestOtp);
router.post("/change-password", requireAuth, changePassword);
router.put("/profile", requireAuth, updateProfile);

module.exports = router;
