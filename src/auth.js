// UI-only auth simulation. No real credentials — this is a prototype gate so the
// hedge-fund reviewer sees a realistic login flow. Backed by localStorage only.

const KEY = "matrix_auth";
const USER_KEY = "matrix_user";

export function signIn(user = {}) {
  localStorage.setItem(KEY, "true");
  if (user && Object.keys(user).length) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function signOut() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthed() {
  return localStorage.getItem(KEY) === "true";
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || {};
  } catch {
    return {};
  }
}
