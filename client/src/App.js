import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import "./App.css";

import Dashboard from "./Dashboard";
import StockDashboard from "./StockDashboard";
import KPILibraryEditor from "./KPILibraryEditor";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import Toast from "./components/Toast";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import PricingPage from "./pages/PricingPage";
import AboutPage from "./pages/AboutPage";
import ScreenerPage from "./pages/ScreenerPage";
import ComparisonPage from "./pages/ComparisonPage";
import SettingsPage from "./pages/SettingsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import AccountPage from "./pages/AccountPage";
import NotFoundPage from "./pages/NotFoundPage";
import CompanyDetailPage from "./pages/CompanyDetailPage";
import { apiUrl, getAuthHeaders } from "./api";
import { AppConfigContext, DEFAULT_APP_CONFIG } from "./AppConfigContext";

export default function App() {
  const [outputFile, setOutputFile] = useState(null);
  const [backendConfig, setBackendConfig] = useState({}); // Backend COLUMN_MAPPING config
  const [appConfig, setAppConfig] = useState(DEFAULT_APP_CONFIG);
  // The pipeline upload is lifted here so it persists across route changes
  // (e.g. visiting Results and returning).
  const [queryFile, setQueryFile] = useState(null);
  const [toast, setToast] = useState("");

  const notify = useCallback((msg) => setToast(msg), []);

  // Fetch backend config on mount. Retries a few times (backend may still be
  // starting) and surfaces a toast instead of failing silently — an empty
  // config leaves the Column Mapper dropdowns blank.
  useEffect(() => {
    let cancelled = false;
    const load = (attempt = 0) => {
      fetch(apiUrl("/column-mapping"), { credentials: "include" })
        .then((res) => res.json())
        .then((data) => { if (!cancelled) setBackendConfig(data); })
        .catch((err) => {
          console.error("Failed to load backend config:", err);
          if (cancelled) return;
          if (attempt < 4) {
            setTimeout(() => load(attempt + 1), 2500);
          } else {
            notify("Backend not reachable — start the server, then reload this page.");
          }
        });
    };
    load();
    return () => { cancelled = true; };
  }, [notify]);

  // Re-fetch app-wide feature flags (called by AppShell after auth is confirmed).
  const refreshAppConfig = useCallback(() => {
    fetch(apiUrl("/app-config"), {
      credentials: "include",
      headers: getAuthHeaders(),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setAppConfig((prev) => ({ ...prev, ...data })); })
      .catch(() => {});
  }, []);

  return (
    <AppConfigContext.Provider value={{ config: appConfig, refresh: refreshAppConfig }}>
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Protected app shell */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <Dashboard
                setOutputFile={setOutputFile}
                backendConfig={backendConfig}
                queryFile={queryFile}
                setQueryFile={setQueryFile}
              />
            }
          />
          {/* Column mapping is now part of the pipeline page; keep the old path as a redirect. */}
          <Route path="column-mapper" element={<Navigate to="/app" replace />} />
          <Route path="results" element={<StockDashboard resultFile={outputFile} />} />
          <Route path="kpi-editor" element={<KPILibraryEditor />} />
          <Route path="screener" element={<ScreenerPage />} />
          <Route path="comparison" element={<ComparisonPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
          <Route path="company/:symbol" element={<CompanyDetailPage />} />
        </Route>

        {/* 404 — must be last */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <Toast message={toast} onClose={() => setToast("")} />
    </BrowserRouter>
    </AppConfigContext.Provider>
  );
}
