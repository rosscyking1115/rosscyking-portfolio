import { expect, test } from "@playwright/test";

import registry from "../../../content/projects/registry.json" with { type: "json" };

/**
 * Role-lens gate (migration risk #6).
 *
 * The Next app read `?lens=` from `searchParams` in a server component and
 * rendered the matching featured set. A prerendered Astro page cannot — the
 * same HTML goes to everyone — so every lens panel is prerendered and CSS picks
 * the visible one off `data-lens`, which an inline head script sets before
 * first paint.
 *
 * Expectations are enumerated from content/projects/registry.json, the same
 * canonical source `validate-projects.mjs` gates, so adding or reordering a
 * lens cannot leave these tests asserting a stale set.
 */

const lenses = registry.lenses as Record<
  string,
  { label: string; headline: string; featured: string[] }
>;
const lensKeys = Object.keys(lenses);
const DEFAULT_LENS = "all";

/** Slugs featured by one lens but not another — the clean before/after pairs. */
function onlyIn(a: string, b: string): string[] {
  return lenses[a]!.featured.filter((slug) => !lenses[b]!.featured.includes(slug));
}

test.describe("shared ?lens= links land on the right set", () => {
  for (const key of lensKeys) {
    test(`?lens=${key} shows the ${key} featured set`, async ({ page }) => {
      await page.goto(key === DEFAULT_LENS ? "/" : `/?lens=${key}`);

      await expect(page.locator("html")).toHaveAttribute("data-lens", key);
      await expect(page.locator(`[data-lens-panel="${key}"]`)).toBeVisible();

      for (const slug of lenses[key]!.featured) {
        await expect(
          page.locator(`[data-lens-panel="${key}"] a[href="/projects/${slug}"]`),
          `${key} should feature ${slug}`,
        ).toBeVisible();
      }
    });
  }

  test("only the selected lens's panel is visible", async ({ page }) => {
    await page.goto("/?lens=ai");
    await expect(page.locator('[data-lens-panel="ai"]')).toBeVisible();
    await expect(page.locator('[data-lens-panel="all"]')).toBeHidden();
    await expect(page.locator('[data-lens-panel="data"]')).toBeHidden();
  });

  test("each lens shows its own headline", async ({ page }) => {
    await page.goto("/?lens=data");
    await expect(page.locator('[data-lens-panel="data"] [data-lens-headline]')).toHaveText(
      lenses.data!.headline,
    );
  });
});

test.describe("unknown and missing lenses fall back to the default", () => {
  test("no query parameter uses the default lens", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-lens", DEFAULT_LENS);
  });

  test("a nonsense lens falls back rather than showing nothing", async ({ page }) => {
    await page.goto("/?lens=not-a-real-lens");
    await expect(page.locator("html")).toHaveAttribute("data-lens", DEFAULT_LENS);
    await expect(page.locator(`[data-lens-panel="${DEFAULT_LENS}"]`)).toBeVisible();
  });

});

/**
 * The lens set was collapsed from four to three (#56), but `/for/:lens` is a
 * wildcard redirect, so old shared links still resolve. They used to fail
 * validation and dump the visitor on the default lens — a link promising
 * "here is my analytics engineering work" landing on the generic set is a quiet
 * broken promise, which is why it went unnoticed.
 *
 * Analytics engineering maps to `data`, not to the default: that is the
 * direction being led with. Ross's call, 2026-07-27.
 */
test.describe("retired lens names land on the right surviving lens", () => {
  const aliases = [
    ["data-engineering", "data"],
    ["analytics-engineering", "data"],
    ["applied-ai", "ai"],
    ["ai-safety", "ai"],
  ] as const;

  for (const [retired, target] of aliases) {
    test(`?lens=${retired} shows the ${target} set`, async ({ page }) => {
      await page.goto(`/?lens=${retired}`);

      await expect(page.locator("html")).toHaveAttribute("data-lens", target);
      await expect(page.locator(`[data-lens-panel="${target}"]`)).toBeVisible();

      for (const slug of lenses[target]!.featured) {
        await expect(
          page.locator(`[data-lens-panel="${target}"] a[href="/projects/${slug}"]`),
        ).toBeVisible();
      }
    });
  }

  test("an alias never points at a lens that no longer exists", async ({ page }) => {
    // Guards the map itself: renaming a lens in registry.json without updating
    // the aliases would strand these URLs on a panel that is never rendered.
    for (const [, target] of aliases) {
      expect(lensKeys, `alias target "${target}" is not a real lens`).toContain(target);
    }
    await page.goto("/");
  });
});

test.describe("switching happens in place", () => {
  test("clicking a lens re-ranks without navigating", async ({ page }) => {
    await page.goto("/");

    // community-energy-flex is featured under `all` but not `data`; neobank is
    // the reverse — the same before/after pair the Next suite used.
    const goneAfterSwitch = onlyIn("all", "data")[0]!;
    const newAfterSwitch = onlyIn("data", "all")[0]!;

    await expect(
      page.locator(`[data-lens-panel="all"] a[href="/projects/${goneAfterSwitch}"]`),
    ).toBeVisible();

    await page.getByRole("button", { name: lenses.data!.label }).click();

    await expect(page.locator("html")).toHaveAttribute("data-lens", "data");
    await expect(
      page.locator(`[data-lens-panel="data"] a[href="/projects/${newAfterSwitch}"]`),
    ).toBeVisible();
    await expect(page.locator('[data-lens-panel="all"]')).toBeHidden();
  });

  test("the URL becomes shareable, and the default lens has a bare URL", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: lenses.ai!.label }).click();
    await expect(page).toHaveURL(/\?lens=ai$/);

    await page.getByRole("button", { name: lenses.all!.label }).click();
    // The default lens is the bare home URL, matching lensHref() in the Next app.
    await expect(page).toHaveURL(/\/$/);
  });

  test("the pressed button reflects the active lens", async ({ page }) => {
    await page.goto("/?lens=ai");
    await expect(
      page.getByRole("button", { name: lenses.ai!.label }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: lenses.all!.label }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("no-flash", () => {
  test("the lens script is inline in <head>, before any stylesheet", async ({
    page,
  }) => {
    await page.goto("/?lens=ai");

    const order = await page.evaluate(() => {
      const nodes = Array.from(document.head.children);
      return {
        scriptIndex: nodes.findIndex(
          (n) => n.tagName === "SCRIPT" && n.textContent?.includes("dataset.lens"),
        ),
        styleIndex: nodes.findIndex(
          (n) =>
            (n.tagName === "LINK" && n.getAttribute("rel") === "stylesheet") ||
            n.tagName === "STYLE",
        ),
      };
    });

    expect(order.scriptIndex, "no inline lens script in <head>").toBeGreaterThan(-1);
    if (order.styleIndex > -1) {
      expect(order.scriptIndex).toBeLessThan(order.styleIndex);
    }
  });

  test("every registry lens is rendered into the page", async ({ page }) => {
    await page.goto("/");
    for (const key of lensKeys) {
      await expect(page.locator(`[data-lens-panel="${key}"]`)).toHaveCount(1);
    }
    expect(lensKeys.length).toBeGreaterThanOrEqual(3);
  });
});
