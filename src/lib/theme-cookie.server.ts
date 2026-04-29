import "server-only";

import { cookies } from "next/headers";

import { THEME_COOKIE, type ThemeCookieValue } from "@/lib/theme-cookie";

/** Read the theme cookie from the request (Server Component only). */
export async function getThemeFromCookie(): Promise<ThemeCookieValue> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}
