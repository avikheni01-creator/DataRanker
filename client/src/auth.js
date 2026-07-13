// auth.js — real auth against the Express backend.
// The JWT is returned in the response body and stored in localStorage so it can
// be sent as an Authorization: Bearer header on every request. This works
// reliably across cross-domain deployments (Vercel frontend + EC2 backend) where
// browsers block third-party httpOnly cookies.

import { apiFetch } from "./api";
import { clearResult } from "./lib/resultStore";

const USER_KEY  = "matrix_user";
const TOKEN_KEY = "matrix_token";

function cacheUser(user, token) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (token) localStorage.setItem(TOKEN_KEY, token);
  return user;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export async function signUp({ name, email, password }) {
  const { user, token } = await apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  return cacheUser(user, token);
}

export async function logIn({ email, password }) {
  const { user, token } = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return cacheUser(user, token);
}

export async function googleLogin(accessToken) {
  const { user, token } = await apiFetch("/auth/google", {
    method: "POST",
    body: JSON.stringify({ accessToken }),
  });
  return cacheUser(user, token);
}

export async function logOut() {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } finally {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    clearResult();
  }
}

// Verify the session with the server. Returns the user or null.
export async function fetchMe() {
  try {
    const { user } = await apiFetch("/auth/me");
    return cacheUser(user, null);
  } catch {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

// Optimistic check from the cached user (used to render before /me resolves).
export function isAuthed() {
  return Boolean(localStorage.getItem(USER_KEY));
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || {};
  } catch {
    return {};
  }
}

// ── Password reset (unauthenticated) ─────────────────────────────────────────

export async function forgotPassword(email) {
  await apiFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(email, otp, newPassword) {
  await apiFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, otp, newPassword }),
  });
}

// ── Password change + profile (authenticated) ─────────────────────────────────

export async function requestOtpForChange() {
  await apiFetch("/auth/request-otp", { method: "POST" });
}

export async function changePassword(otp, newPassword) {
  await apiFetch("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ otp, newPassword }),
  });
}

export async function updateProfile(name) {
  const { user } = await apiFetch("/auth/profile", {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
  return cacheUser(user, null);
}

export async function verifyEmail(otp) {
  const { user } = await apiFetch("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ otp }),
  });
  return cacheUser(user, null);
}

export async function resendVerification() {
  await apiFetch("/auth/resend-verification", { method: "POST" });
}
