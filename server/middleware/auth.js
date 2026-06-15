// middleware/auth.js — JWT helpers + route guard.
// The JWT lives in an httpOnly cookie ("token"); the browser never sees it in JS.

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const COOKIE_NAME = "token";

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "7d",
  });
}

// Set/clear the auth cookie. SameSite=None+Secure is required for cross-site
// cookies in production (frontend and API on different domains); lax over http
// for local dev.
function cookieOptions() {
  const prod = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: prod,
    sameSite: prod ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
    path: "/",
  };
}

function setAuthCookie(res, userId) {
  res.cookie(COOKIE_NAME, signToken(userId), cookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
}

// Guard: require a valid token and attach req.user (full document).
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies && req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ detail: "Not authenticated" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ detail: "Not authenticated" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ detail: "Not authenticated" });
  }
}

module.exports = {
  COOKIE_NAME,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
};
