import { afterEach, describe, expect, it } from "vitest";

import { browserCookie } from "@/lib/theme-cookie";

function clearCookies() {
  document.cookie.split(";").forEach((c) => {
    const eq = c.indexOf("=");
    const name = (eq > -1 ? c.substring(0, eq) : c).trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
}

describe("browserCookie", () => {
  afterEach(() => clearCookies());

  it("returns 'system' when no cookie is set", () => {
    expect(browserCookie.get()).toBe("system");
  });

  it("round-trips a written value", () => {
    browserCookie.set("dark");
    expect(browserCookie.get()).toBe("dark");

    browserCookie.set("light");
    expect(browserCookie.get()).toBe("light");
  });

  it("falls back to 'system' for an unknown value", () => {
    document.cookie = "theme=invalid; path=/";
    expect(browserCookie.get()).toBe("system");
  });
});
