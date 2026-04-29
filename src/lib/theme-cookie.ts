/**
 * Client-safe theme cookie helpers.
 * Imported by both Server and Client Components — must NOT pull in
 * `next/headers` or anything else server-only.
 */

export const THEME_COOKIE = "theme";

export type ThemeCookieValue = "light" | "dark" | "system";

function isThemeValue(value: unknown): value is ThemeCookieValue {
  return value === "light" || value === "dark" || value === "system";
}

/** Browser-side helpers (used by ThemeProvider in Client Components). */
export const browserCookie = {
  get(): ThemeCookieValue {
    if (typeof document === "undefined") return "system";
    const match = document.cookie.match(/(?:^|;\s*)theme=([^;]+)/);
    const value = match ? decodeURIComponent(match[1]) : null;
    return isThemeValue(value) ? value : "system";
  },
  set(value: ThemeCookieValue) {
    if (typeof document === "undefined") return;
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `${THEME_COOKIE}=${value}; path=/; max-age=${oneYear}; samesite=lax`;
  },
};
