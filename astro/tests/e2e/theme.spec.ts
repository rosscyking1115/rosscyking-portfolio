import { expect, test } from "@playwright/test";

/**
 * Theme gate (migration risk #5).
 *
 * The Next app read the `theme` cookie server-side and rendered the right class
 * into the HTML. A prerendered Astro page cannot, so an inline head script does
 * it before first paint instead. Astro's docs carry no dark-mode recipe, so
 * this is a hand-rolled solution — and a flash of the wrong theme is the kind
 * of regression nobody notices in review.
 *
 * The cookie name and values are unchanged from the Next app, so a returning
 * visitor keeps the theme they already chose. That is asserted below, because
 * silently resetting everyone's preference would be an easy thing to miss.
 */

const THEME_COOKIE = { name: "theme", domain: "localhost", path: "/" };

/**
 * The nav renders a toggle for desktop and another for mobile, and exactly one
 * is visible at any viewport. Target the visible one rather than `.first()`, so
 * these tests keep working whichever breakpoint they run at.
 */
const themeToggle = (page: import("@playwright/test").Page) =>
  page.getByTestId("theme-toggle").locator("visible=true");

test.describe("no-flash: the theme is applied before paint", () => {
  test("the inline script is in <head> and precedes every stylesheet", async ({
    page,
  }) => {
    await page.goto("/contact");

    // The invariant that actually prevents the flash: the class must be set
    // before the browser has any CSS to paint with. Bundling the script (i.e.
    // dropping `is:inline`) would make it deferred and break this silently.
    const order = await page.evaluate(() => {
      const nodes = Array.from(document.head.children);
      const scriptIndex = nodes.findIndex(
        (n) => n.tagName === "SCRIPT" && n.textContent?.includes("prefers-color-scheme"),
      );
      const styleIndex = nodes.findIndex(
        (n) =>
          (n.tagName === "LINK" && n.getAttribute("rel") === "stylesheet") ||
          n.tagName === "STYLE",
      );
      return { scriptIndex, styleIndex };
    });

    expect(order.scriptIndex, "no inline theme script found in <head>").toBeGreaterThan(
      -1,
    );
    if (order.styleIndex > -1) {
      expect(
        order.scriptIndex,
        "theme script must come before the first stylesheet",
      ).toBeLessThan(order.styleIndex);
    }
  });

  test("a stored dark preference is applied immediately", async ({ page, context }) => {
    await context.addCookies([{ ...THEME_COOKIE, value: "dark" }]);
    await page.goto("/contact");

    await expect(page.locator("html")).toHaveClass(/dark/);
    expect(await page.evaluate(() => document.documentElement.style.colorScheme)).toBe(
      "dark",
    );
  });

  test("a stored light preference wins over a dark OS setting", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    await context.addCookies([{ ...THEME_COOKIE, value: "light" }]);
    const page = await context.newPage();
    await page.goto("/contact");

    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await context.close();
  });
});

test.describe("system preference", () => {
  test("follows a dark OS setting when nothing is stored", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto("/contact");

    await expect(page.locator("html")).toHaveClass(/dark/);
    await context.close();
  });

  test("follows a light OS setting when nothing is stored", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await page.goto("/contact");

    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await context.close();
  });
});

test.describe("toggle", () => {
  test("cycles light → dark → system and persists across a reload", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await page.goto("/contact");

    const html = page.locator("html");
    const toggle = themeToggle(page);

    // Starts on "system", which resolves light here.
    await expect(html).toHaveAttribute("data-theme", "system");
    await expect(html).not.toHaveClass(/dark/);

    await toggle.click();
    await expect(html).toHaveAttribute("data-theme", "light");

    await toggle.click();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(html).toHaveClass(/dark/);

    // The choice must survive a full reload via the cookie — this is the bit
    // the inline script has to pick up with no flash.
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(html).toHaveClass(/dark/);

    await toggle.click();
    await expect(html).toHaveAttribute("data-theme", "system");

    await context.close();
  });

  test("names the outcome, not the current state, and keeps the tooltip", async ({
    browser,
  }) => {
    /**
     * Ported affordance, asserted because it was lost once already. The Astro
     * toggle had shipped `aria-label="Theme: light. Change theme."` and no
     * `title` at all, where Next names WHAT THE CLICK WILL DO and repeats it as
     * a hover tooltip. Nothing caught it: the toggle worked, the theme changed,
     * and every existing assertion here is about `data-theme` on <html>.
     */
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await page.goto("/contact");

    const toggle = themeToggle(page);
    const expected = {
      system: "Switch to light theme",
      light: "Switch to dark theme",
      dark: "Switch to system theme",
    } as const;

    for (const theme of ["system", "light", "dark"] as const) {
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(toggle, `${theme}: aria-label`).toHaveAttribute(
        "aria-label",
        expected[theme],
      );
      // The tooltip is the half that was missing entirely.
      await expect(toggle, `${theme}: title`).toHaveAttribute("title", expected[theme]);
      await toggle.click();
    }

    await context.close();
  });

  test("writes the same cookie name and values as the Next app", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/contact");

    await themeToggle(page).click();

    const cookie = (await context.cookies()).find((c) => c.name === "theme");
    expect(cookie, "no `theme` cookie written").toBeDefined();
    expect(["light", "dark", "system"]).toContain(cookie?.value);
    expect(cookie?.path).toBe("/");
    await context.close();
  });
});
