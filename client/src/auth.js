// auth.js — real auth against the Express backend.
// The JWT lives in an httpOnly cookie (not readable from JS); we cache the
// returned user object in localStorage for instant UI and verify with the
// server via fetchMe()/ProtectedRoute.

import { apiFetch } from "./api";

const USER_KEY = "matrix_user";

function cacheUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function signUp({ name, email, password }) {
  const { user } = await apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  return cacheUser(user);
}

export async function logIn({ email, password }) {
  const { user } = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return cacheUser(user);
}

export async function logOut() {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } finally {
    localStorage.removeItem(USER_KEY);
  }
}

// Verify the session with the server. Returns the user or null.
export async function fetchMe() {
  try {
    const { user } = await apiFetch("/auth/me");
    return cacheUser(user);
  } catch {
    localStorage.removeItem(USER_KEY);
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
