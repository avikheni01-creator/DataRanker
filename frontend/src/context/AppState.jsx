"use client";

// Shared pipeline state for the whole /app/* subtree. In the old CRA app this
// state was lifted into App.js and threaded through react-router props; here it
// lives in a context provider mounted by app/app/layout.js, which persists
// across route changes (the layout does not remount on navigation).
//
// Contract consumed by every /app page via useAppState():
//   outputFile, setOutputFile          — the ranked XLSX Blob from /run-pipeline
//   backendConfig                      — GET /column-mapping result (auto-map source)
//   columnMapping, setColumnMapping    — final CSV→output mapping (was COLUMN_MAPPING)
//   queryFile / mappingFile / kpiFile  — the three pipeline uploads (+ setters)
//   notify(msg)                        — fire a toast

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import Toast from "@/components/Toast";
import { apiUrl } from "@/lib/api";

const AppStateContext = createContext(null);

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within <AppStateProvider>");
  return ctx;
}

export function AppStateProvider({ children }) {
  const [outputFile, setOutputFile] = useState(null);
  const [backendConfig, setBackendConfig] = useState({});
  const [columnMapping, setColumnMapping] = useState({});
  // Pipeline upload files persist across route changes (e.g. visiting the
  // Column Mapper and returning to the pipeline page).
  const [queryFile, setQueryFile] = useState(null);
  const [mappingFile, setMappingFile] = useState(null);
  const [kpiFile, setKpiFile] = useState(null);
  const [toast, setToast] = useState("");

  const notify = useCallback((msg) => setToast(msg), []);

  // Fetch backend config on mount. Retries a few times (backend may still be
  // starting) and surfaces a toast instead of failing silently — an empty
  // config leaves the Column Mapper dropdowns blank.
  useEffect(() => {
    let cancelled = false;
    const load = (attempt = 0) => {
      fetch(apiUrl("/column-mapping"))
        .then((res) => res.json())
        .then((data) => { if (!cancelled) setBackendConfig(data); })
        .catch((err) => {
          console.error("Failed to load backend config:", err);
          if (cancelled) return;
          if (attempt < 4) {
            setTimeout(() => load(attempt + 1), 2500);
          } else {
            notify("Backend not reachable — start the Express server, then reload this page.");
          }
        });
    };
    load();
    return () => { cancelled = true; };
  }, [notify]);

  const value = {
    outputFile, setOutputFile,
    backendConfig,
    columnMapping, setColumnMapping,
    queryFile, setQueryFile,
    mappingFile, setMappingFile,
    kpiFile, setKpiFile,
    notify,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
      <Toast message={toast} onClose={() => setToast("")} />
    </AppStateContext.Provider>
  );
}
