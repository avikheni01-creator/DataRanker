// controllers/authController.js - signup / login / me / logout / google OAuth / OTP flows.

const User = require("../models/User");
const OtpToken = require("../models/OtpToken");
const { sendOtpEmail } = require("../services/mailer");
const { signToken, setAuthCookie, clearAuthCookie } = require("../middleware/auth");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function signup(req, res) {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ detail: "Name, email and password are required" });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ detail: "Enter a valid email address" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ detail: "Password must be at least 8 characters" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ detail: "An account with that email already exists" });
    }

    const trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90-day trial
    const user = new User({ name, email, plan: "standard", trialEndsAt });
    await user.setPassword(password);
    await user.save();

    const userId = user._id.toString();
    setAuthCookie(res, userId);
    // Send verification email non-blocking - don't fail signup if mail fails.
    // Use the stored (normalized) email so the token matches at verify time.
    OtpToken.generate(user.email, "verify")
      .then((otp) => sendOtpEmail(user.email, otp, "verify"))
      .catch((err) => console.error("Verification email failed:", err));
    return res.status(201).json({ user: user.toSafeJSON(), token: signToken(userId) });
  } catch (err) {
    return res.status(500).json({ detail: String(err.message || err) });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ detail: "Email and password are required" });
    }
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ detail: "Invalid email or password" });
    }
    const userId = user._id.toString();
    setAuthCookie(res, userId);
    return res.json({ user: user.toSafeJSON(), token: signToken(userId) });
  } catch (err) {
    return res.status(500).json({ detail: String(err.message || err) });
  }
}

async function me(req, res) {
  return res.json({ user: req.user.toSafeJSON() });
}

async function logout(req, res) {
  clearAuthCookie(res);
  return res.json({ ok: true });
}

async function googleAuth(req, res) {
  try {
    const { accessToken } = req.body || {};
    if (!accessToken) return res.status(400).json({ detail: "Missing Google access token" });

    // Verify the token by calling Google's userinfo endpoint.
    const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!infoRes.ok) {
      return res.status(400).json({ detail: "Invalid or expired Google token" });
    }
    const { sub: googleId, email, name, email_verified } = await infoRes.json();

    if (!email_verified) {
      return res.status(400).json({ detail: "Google account email is not verified" });
    }

    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });
    if (user) {
      let changed = false;
      if (!user.googleId) { user.googleId = googleId; changed = true; }
      // Google accounts are always email-verified.
      if (!user.emailVerified) { user.emailVerified = true; changed = true; }
      if (changed) await user.save();
    } else {
      user = new User({ name, email, googleId, plan: "free", emailVerified: true });
      await user.save();
    }

    const userId = user._id.toString();
    setAuthCookie(res, userId);
    return res.json({ user: user.toSafeJSON(), token: signToken(userId) });
  } catch (err) {
    return res.status(500).json({ detail: String(err.message || err) });
  }
}

// ── Email verification (authenticated) ────────────────────────────────────────

async function verifyEmail(req, res) {
  try {
    if (req.user.emailVerified) return res.json({ user: req.user.toSafeJSON() });
    const { otp } = req.body || {};
    if (!otp) return res.status(400).json({ detail: "Code is required" });
    const valid = await OtpToken.verify(req.user.email, otp, "verify");
    if (!valid) return res.status(400).json({ detail: "Invalid or expired code" });
    req.user.emailVerified = true;
    await req.user.save();
    return res.json({ user: req.user.toSafeJSON() });
  } catch (err) {
    return res.status(500).json({ detail: String(err.message || err) });
  }
}

async function resendVerification(req, res) {
  try {
    if (req.user.emailVerified) return res.json({ ok: true });
    const otp = await OtpToken.generate(req.user.email, "verify");
    await sendOtpEmail(req.user.email, otp, "verify");
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ detail: String(err.message || err) });
  }
}

// ── Password reset (unauthenticated) ─────────────────────────────────────────

async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ detail: "Enter a valid email address" });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      const otp = await OtpToken.generate(email, "reset");
      await sendOtpEmail(email, otp, "reset");
    }
    // Always return 200 to prevent email enumeration.
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ detail: String(err.message || err) });
  }
}

async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body || {};
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ detail: "Email, code and new password are required" });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ detail: "Password must be at least 8 characters" });
    }
    const valid = await OtpToken.verify(email, otp, "reset");
    if (!valid) {
      return res.status(400).json({ detail: "Invalid or expired verification code" });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ detail: "No account found for that email" });
    await user.setPassword(newPassword);
    await user.save();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ detail: String(err.message || err) });
  }
}

// ── Password change + profile (authenticated) ─────────────────────────────────

async function requestOtp(req, res) {
  try {
    const otp = await OtpToken.generate(req.user.email, "change");
    await sendOtpEmail(req.user.email, otp, "change");
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ detail: String(err.message || err) });
  }
}

async function changePassword(req, res) {
  try {
    const { otp, newPassword } = req.body || {};
    if (!otp || !newPassword) {
      return res.status(400).json({ detail: "Code and new password are required" });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ detail: "Password must be at least 8 characters" });
    }
    const valid = await OtpToken.verify(req.user.email, otp, "change");
    if (!valid) {
      return res.status(400).json({ detail: "Invalid or expired verification code" });
    }
    await req.user.setPassword(newPassword);
    await req.user.save();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ detail: String(err.message || err) });
  }
}

async function updateProfile(req, res) {
  try {
    const { name } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ detail: "Name is required" });
    }
    req.user.name = String(name).trim();
    await req.user.save();
    return res.json({ user: req.user.toSafeJSON() });
  } catch (err) {
    return res.status(500).json({ detail: String(err.message || err) });
  }
}

module.exports = {
  signup, login, me, logout, googleAuth,
  verifyEmail, resendVerification,
  forgotPassword, resetPassword, requestOtp, changePassword, updateProfile,
};
