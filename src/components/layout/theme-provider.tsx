"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { browserCookie, type ThemeCookieValue } from "@/lib/theme-cookie";

export type Theme = ThemeCookieValue;
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/* ---------------- System preference subscription ---------------- */

const SYSTEM_QUERY = "(prefers-color-scheme: dark)";

function subscribeSystem(notify: () => void) {
  const media = window.matchMedia(SYSTEM_QUERY);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}

function readSystemSnapshot(): ResolvedTheme {
  return window.matchMedia(SYSTEM_QUERY).matches ? "dark" : "light";
}

function readSystemServerSnapshot(): ResolvedTheme {
  return "light";
}

/* ---------------- Provider ---------------- */

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function ThemeProvider({
  children,
  initialTheme = "system",
}: {
  children: ReactNode;
  initialTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const systemTheme = useSyncExternalStore(
    subscribeSystem,
    readSystemSnapshot,
    readSystemServerSnapshot,
  );

  const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme;

  // Apply class whenever resolved theme changes. This is the only allowed
  // setState-like effect: it writes to the DOM (an external system), not to
  // React state.
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    browserCookie.set(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}
