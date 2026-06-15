// Single source of truth for the backend base URL. Override with
// NEXT_PUBLIC_API_URL at build/deploy time; defaults to local Express server.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const apiUrl = (path) => `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
