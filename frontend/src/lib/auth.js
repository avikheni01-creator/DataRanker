// UI-only auth simulation. No real credentials — this is a prototype gate so the
// hedge-fund reviewer sees a realistic login flow. Backed by localStorage only.
// SSR-safe: every accessor guards against `window` being undefined on the server.

const KEY = "matrix_auth";
const USER_KEY = "matrix_user";

export function signIn(user = {}) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, "true");
  if (user && Object.keys(user).length) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function signOut() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthed() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "true";
}

export function getUser() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || {};
  } catch {
    return {};
  }
}
