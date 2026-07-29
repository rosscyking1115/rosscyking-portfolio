import { expect, test } from "@playwright/test";

/**
 * Design foundation gate (Phase A of the migration).
 *
 * The tokens, fonts and layout shell are the base every page sits on, and they
 * fail quietly: a broken `@theme inline` block or a missing font just renders
 * plausible-looking defaults. Nothing throws, nothing 404s, and the site simply
 * stops looking like itself. These assertions pin the values that would drift.
 *
 * Colours are the exact hex from the Next app's globals.css, converted to the
 * rgb() form getComputedStyle returns.
 */

const LIGHT_BG = "rgb(250, 250, 251)"; // #fafafb
const LIGHT_FG = "rgb(28, 30, 34)"; //   #1c1e22
const DARK_BG = "rgb(21, 22, 25)"; //    #151619
const DARK_FG = "rgb(231, 232, 234)"; // #e7e8ea

test.describe("design tokens", () => {
  test("light theme resolves to the ported palette", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await page.goto("/");

    const styles = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      const root = getComputedStyle(document.documentElement);
      return {
        background: body.backgroundColor,
        color: body.color,
        primary: root.getPropertyValue("--primary").trim(),
        border: root.getPropertyValue("--border").trim(),
      };
    });

    expect(styles.background).toBe(LIGHT_BG);
    expect(styles.color).toBe(LIGHT_FG);
    expect(styles.primary).toBe("#3d5a73");
    expect(styles.border).toBe("#e2e3e7");
    await context.close();
  });

  test("dark theme flips background and the steel-blue accent", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto("/");

    const styles = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      const root = getComputedStyle(document.documentElement);
      return {
        background: body.backgroundColor,
        color: body.color,
        primary: root.getPropertyValue("--primary").trim(),
      };
    });

    expect(styles.background).toBe(DARK_BG);
    expect(styles.color).toBe(DARK_FG);
    // The accent lightens in dark mode rather than staying put — an easy thing
    // to lose when porting a token block.
    expect(styles.primary).toBe("#8fa9c2");
    await context.close();
  });

  test("the ruler divider keeps its hairline-tick background", async ({ page }) => {
    await page.goto("/");
    const background = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.className = "ruler";
      document.body.append(probe);
      const value = getComputedStyle(probe).backgroundImage;
      probe.remove();
      return value;
    });
    // Part of the index-mark signature; without it the dividers vanish silently.
    expect(background).toContain("repeating-linear-gradient");
  });
});

test.describe("fonts", () => {
  test("all three families load and map to the right utilities", async ({ page }) => {
    await page.goto("/");
    // Astro's Fonts API hashes family names (e.g. "Geist-0c348e1f07270ecf"),
    // so match on the prefix rather than an exact string.
    const families = await page.evaluate(() => {
      const probe = document.createElement("div");
      document.body.append(probe);
      const read = (className: string) => {
        probe.className = className;
        return getComputedStyle(probe).fontFamily;
      };
      const result = {
        sans: read("font-sans"),
        mono: read("font-mono"),
        display: read("font-display"),
        faces: document.fonts.size,
      };
      probe.remove();
      return result;
    });

    expect(families.sans).toContain("Geist");
    expect(families.mono).toContain("Geist Mono");
    expect(families.display).toContain("Space Grotesk");
    expect(families.faces, "no @font-face rules were emitted").toBeGreaterThan(0);
  });

  test("fonts are self-hosted, so the CSP needs no extra origin", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      if (
        request.resourceType() === "font" &&
        !request.url().startsWith("http://localhost")
      ) {
        external.push(request.url());
      }
    });
    await page.goto("/", { waitUntil: "networkidle" });
    // The production CSP allows `font-src 'self' data:` only. A font fetched
    // from a CDN would be blocked in production but pass in dev, so catch it here.
    expect(external, `fonts fetched off-origin: ${external.join(", ")}`).toEqual([]);
  });
});

test.describe("layout shell", () => {
  test("renders nav, footer and a skip link", async ({ page }) => {
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav).toBeVisible();
    for (const label of ["Home", "Projects", "About", "Contact"]) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
    }

    await expect(page.getByRole("contentinfo")).toBeAttached();
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeAttached();
    await expect(page.locator("main#main")).toBeVisible();
  });

  test("marks the current page for assistive tech", async ({ page }) => {
    await page.goto("/contact");
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: "Contact", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // Resolved at build time from Astro.url, so it is right on first paint —
    // no hydration needed, unlike the usePathname() version.
    await expect(nav.getByRole("link", { name: "Home", exact: true })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("the mobile menu opens, closes, and locks scroll — without React", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const toggle = page.getByRole("button", { name: /menu/i });
    const menu = page.locator("#mobile-menu");

    await expect(menu).toBeHidden();
    await toggle.click();
    await expect(menu).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");

    // Escape closes it — behaviour the React version never had.
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  });
});
