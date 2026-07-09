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
