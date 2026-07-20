// lib/resultStore.js — persist the latest pipeline result (the ranked XLSX blob)
// in IndexedDB so the Results page survives a page refresh or deep-link. A blob
// is too large/binary for localStorage, so we use IndexedDB and store the Blob
// directly. All calls are best-effort: failures degrade to in-memory-only.

const DB_NAME = "thinkvest";
const STORE = "results";
const KEY = "latest";

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Save the latest result blob (overwrites any previous one).
export async function saveResult(blob) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* best-effort — persistence is a convenience, not a requirement */
  }
}

// Load the latest result blob, or null if none / on error.
export async function loadResult() {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

// Remove the stored result (e.g. on sign-out, so the next user can't see it).
export async function clearResult() {
  try {
    const db = await openDB();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  } catch {
    /* ignore */
  }
}
