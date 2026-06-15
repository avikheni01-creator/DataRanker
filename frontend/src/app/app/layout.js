"use client";

// Layout for the whole /app/* subtree. Mirrors the old CRA route:
//   <ProtectedRoute><AppShell><Outlet/></AppShell></ProtectedRoute>
// plus the lifted pipeline state (now in AppStateProvider). This layout does
// not remount on navigation, so the shared state + uploads survive route
// changes between Pipeline / Column Mapper / Results / KPI Editor.

import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import { AppStateProvider } from "@/context/AppState";

export default function AppLayout({ children }) {
  return (
    <ProtectedRoute>
      <AppStateProvider>
        <AppShell>{children}</AppShell>
      </AppStateProvider>
    </ProtectedRoute>
  );
}
