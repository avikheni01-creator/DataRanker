// controllers/authController.js — signup / login / me / logout.

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

module.exports = { signup, login, me, logout };
