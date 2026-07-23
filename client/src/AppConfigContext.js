import { createContext, useContext } from "react";

export const DEFAULT_APP_CONFIG = {
  allowCustomUpload:  true,
  screenerEnabled:    true,
  comparisonEnabled:  true,
  kpiEditorLocked:    false,
  screenerMaxRows:    0,
  maintenanceBanner:  "",
};

// Context holds { config, refresh } so AppShell can re-fetch after login
// without needing to thread setAppConfig through props.
export const AppConfigContext = createContext({ config: DEFAULT_APP_CONFIG, refresh: () => {} });

// Consumer hook - returns the flat config object (unchanged API for all pages).
export const useAppConfig = () => useContext(AppConfigContext).config;

// Used by AppShell to trigger a re-fetch right after the user is authenticated.
export const useRefreshAppConfig = () => useContext(AppConfigContext).refresh;
