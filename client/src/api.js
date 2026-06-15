// api.js — central backend base URL + fetch helper.
// Base comes from REACT_APP_API_URL (see client/.env), defaulting to local dev.
// Every request sends credentials so the httpOnly auth cookie travels with it.

export const API_BASE = (
  process.env.REACT_APP_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

export function apiUrl(path) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

// JSON fetch with credentials. Throws Error(detail) on non-2xx.
export async function apiFetch(path, options = {}) {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : null;
  if (!res.ok) {
    throw new Error((body && body.detail) || `Request failed (${res.status})`);
  }
  return body;
}
