// theme/ThemeContext.jsx — app-wide light/dark mode.
// Persists the choice to localStorage and reflects it on <html data-theme>,
// which drives all the CSS variables in index.css.

import { createContext, useContext, useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "matrix_theme";
const ThemeContext = createContext({ mode: "dark", toggle: () => {}, setMode: () => {} });

function getInitialMode() {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  // Fall back to OS preference, default dark.
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getInitialMode);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const toggle = useCallback(
    () => setMode((m) => (m === "dark" ? "light" : "dark")),
    []
  );

  return (
    <ThemeContext.Provider value={{ mode, toggle, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeContext);
}
