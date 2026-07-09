// api.js — central backend base URL + fetch helper.
// Base comes from REACT_APP_API_URL (see client/.env), defaulting to local dev.
// Sends the JWT as an Authorization: Bearer header (works cross-domain) and also
// includes credentials so the httpOnly cookie travels on same-domain setups.

export const API_BASE = (
  process.env.REACT_APP_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

export function apiUrl(path) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function getToken() {
  try { return localStorage.getItem("matrix_token"); } catch { return null; }
}

// JSON fetch with credentials. Throws Error(detail) on non-2xx.
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : null;
  if (!res.ok) {
    throw new Error((body && body.detail) || `Request failed (${res.status})`);
  }
  return body;
}
