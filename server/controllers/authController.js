// controllers/authController.js — signup / login / me / logout / google OAuth.

const User = require("../models/User");
const { setAuthCookie, clearAuthCookie } = require("../middleware/auth");

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

    const user = new User({ name, email, plan: "free" });
    await user.setPassword(password);
    await user.save();

    setAuthCookie(res, user._id.toString());
    return res.status(201).json({ user: user.toSafeJSON() });
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
    setAuthCookie(res, user._id.toString());
    return res.json({ user: user.toSafeJSON() });
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
      // Link Google ID if this email existed without it (e.g. registered with password first).
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      user = new User({ name, email, googleId, plan: "free" });
      await user.save();
    }

    setAuthCookie(res, user._id.toString());
    return res.json({ user: user.toSafeJSON() });
  } catch (err) {
    return res.status(500).json({ detail: String(err.message || err) });
  }
}

module.exports = { signup, login, me, logout, googleAuth };
