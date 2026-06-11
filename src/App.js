import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import "./App.css";

import Dashboard from "./Dashboard";
import StockDashboard from "./StockDashboard";
import KPILibraryEditor from "./KPILibraryEditor";
import ColumnMapper from "./components/ColumnMapper";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import Toast from "./components/Toast";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";

// Gates the KPI Editor: only reachable once a KPI library has been uploaded.
function KpiGate({ kpiFile, notify, children }) {
  useEffect(() => {
    if (!kpiFile) notify("Upload your KPI library first.");
  }, [kpiFile, notify]);

  if (!kpiFile) return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  const [outputFile, setOutputFile] = useState(null);
  const [backendConfig, setBackendConfig] = useState({}); // Backend COLUMN_MAPPING config
  const [COLUMN_MAPPING, setCOLUMN_MAPPING] = useState({});
  // Pipeline upload files are lifted here so they persist across route changes
  // (e.g. visiting Column Mapper and returning). kpiFile also gates the KPI editor.
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
      fetch("http://localhost:8000/column-mapping")
        .then((res) => res.json())
        .then((data) => { if (!cancelled) setBackendConfig(data); })
        .catch((err) => {
          console.error("Failed to load backend config:", err);
          if (cancelled) return;
          if (attempt < 4) {
            setTimeout(() => load(attempt + 1), 2500);
          } else {
            notify("Backend not reachable at localhost:8000 — start it, then reload this page.");
          }
        });
    };
    load();
    return () => { cancelled = true; };
  }, [notify]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected app shell */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppShell kpiFile={kpiFile} />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <Dashboard
                setOutputFile={setOutputFile}
                columnMapping={COLUMN_MAPPING}
                queryFile={queryFile}
                setQueryFile={setQueryFile}
                mappingFile={mappingFile}
                setMappingFile={setMappingFile}
                kpiFile={kpiFile}
                setKpiFile={setKpiFile}
              />
            }
          />
          <Route
            path="column-mapper"
            element={
              <ColumnMapper
                backendConfig={backendConfig}
                setCOLUMN_MAPPING={setCOLUMN_MAPPING}
              />
            }
          />
          <Route path="results" element={<StockDashboard resultFile={outputFile} />} />
          <Route
            path="kpi-editor"
            element={
              <KpiGate kpiFile={kpiFile} notify={notify}>
                <KPILibraryEditor />
              </KpiGate>
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toast message={toast} onClose={() => setToast("")} />
    </BrowserRouter>
  );
}
