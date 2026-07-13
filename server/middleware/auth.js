// middleware/auth.js — JWT helpers + route guard.
// Accepts the JWT as either an httpOnly cookie OR an Authorization: Bearer header.
// The header approach is required for cross-domain deployments (separate frontend/
// backend origins) where browsers block third-party cookies.

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const COOKIE_NAME = "token";

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "7d",
  });
}

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

// Extract token from either the httpOnly cookie or the Authorization header.
// Header takes priority so cross-domain clients that can't send cookies still work.
function extractToken(req) {
  const authHeader = req.headers && req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return req.cookies && req.cookies[COOKIE_NAME];
}

// Guard: require a valid token and attach req.user (full document).
async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
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

// Guard: require the signed-in user to have isAdmin:true.
// Must be chained after requireAuth (req.user is already set).
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ detail: "Admin access required." });
  }
  next();
}

// Guard: require Premium or Enterprise plan (or admin regardless of plan).
// Must be chained after requireAuth.
function requirePremium(req, res, next) {
  if (!req.user) return res.status(401).json({ detail: "Not authenticated" });
  if (req.user.plan === "free" && !req.user.isAdmin) {
    return res.status(403).json({ detail: "This feature requires a Premium or Enterprise plan." });
  }
  next();
}

module.exports = {
  COOKIE_NAME,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  requireAdmin,
  requirePremium,
};
