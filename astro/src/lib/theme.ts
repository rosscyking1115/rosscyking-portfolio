/**
 * Theme constants and browser helpers (migration risk #5).
 *
 * Ported from the Next app's src/lib/theme-cookie.ts. The COOKIE NAME AND
 * VALUES ARE UNCHANGED on purpose: a returning visitor keeps the theme they
 * already chose, rather than being silently reset by the migration.
 *
 * The Next counterpart, src/lib/theme-cookie.server.ts, has no equivalent here
 * and is not ported. It read the cookie with `next/headers` during a server
 * render — something a prerendered Astro page cannot do, because there is no
 * request at build time. That is the whole of risk #5, and the answer is the
 * inline script in ThemeScript.astro.
 */

export const THEME_COOKIE = "theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const SYSTEM_QUERY = "(prefers-color-scheme: dark)";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

/** Browser-side helpers. Mirrors `browserCookie` in the Next app. */
export const browserCookie = {
  get(): Theme {
    if (typeof document === "undefined") return "system";
    const match = document.cookie.match(/(?:^|;\s*)theme=([^;]+)/);
    const value = match ? decodeURIComponent(match[1]) : null;
    return isTheme(value) ? value : "system";
  },
  set(value: Theme) {
    if (typeof document === "undefined") return;
    document.cookie = `${THEME_COOKIE}=${value}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
  },
};

/** Resolve a stored preference against the OS setting. */
export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia(SYSTEM_QUERY).matches ? "dark" : "light";
}
