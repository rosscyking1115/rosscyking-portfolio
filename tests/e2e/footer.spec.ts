import { expect, test } from "@playwright/test";

import { ROUTES } from "./routes";

/**
 * Two footer densities (execution audit, finding 13).
 *
 *   "One footer, 255px, eight times. Eleven links, a bio sentence, a rule, two
 *    mono lines — identical on every route and at every width. On the write-up
 *    it is 4% of the page. On /404 it is 28%, and on /contact it is 22%. A
 *    footer that is a fifth of the page is no longer furniture; it is the page."
 *
 * ── THE SHARE IS THE FINDING, NOT THE HEIGHT ─────────────────────────────────
 * 255px is right at the foot of a 5,000px write-up and wrong at the foot of an
 * 1,100px 404, and no single footer can be both. So this gate is a RATIO rather
 * than a list of routes: a route that gets shorter — because a section moved to
 * a rail, or a page was cut — is a route that may need the other density, and
 * naming the two current ones would say nothing when a third arrives.
 */

/**
 * The audit's own line is a fifth of the page. This sits under it with room:
 * the highest full-footer share after the change is /projects at 13.6%, and a
 * threshold one point above the current maximum fails on noise rather than on
 * regressions.
 */
const MAX_SHARE = 0.18;

test.describe("footer density", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const route of ROUTES) {
    test(`${route} does not spend a fifth of itself on the footer`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      const measured = await page.evaluate(() => {
        const footer = document.querySelector("footer")!.getBoundingClientRect();
        return { doc: document.body.scrollHeight, footer: Math.round(footer.height) };
      });

      const share = measured.footer / measured.doc;
      expect(
        share,
        `${route}: the footer is ${(share * 100).toFixed(1)}% of the page (${measured.footer}px of ${measured.doc}px) — it needs the compact density`,
      ).toBeLessThan(MAX_SHARE);
    });
  }

  test("the compact footer keeps the link a reader might be owed", async ({ page }) => {
    // PRIVACY IS NOT A STYLE CHOICE HERE. The two routes on the compact density
    // are /404 and /contact, and /contact is the only page on the site that
    // collects anything — with no privacy link anywhere in the form or its
    // small print, this footer is the sole route to the notice from the page
    // that most needs one. Drop it to get the count to five and the site is
    // asking for a name and an email with no statement of what happens to them.
    for (const route of ["/contact", "/no-such-page-exists"]) {
      await page.goto(route);
      const nav = page.getByRole("navigation", { name: "Footer" });
      await expect(nav.getByRole("link", { name: "Privacy" })).toBeVisible();
      await expect(nav.getByRole("link")).toHaveCount(5);
    }
  });

  test("every route keeps a landmark, a way home and a copyright", async ({ page }) => {
    // What the density may NOT change. A compact footer is a shorter footer,
    // not a different one — and the failure mode of "trim the footer" is
    // trimming it until it is a rule with a year under it.
    for (const route of ROUTES) {
      await page.goto(route);
      const footer = page.getByRole("contentinfo");
      await expect(footer, `${route} has no footer landmark`).toBeVisible();
      await expect(
        footer.getByRole("link", { name: "Ross King" }).first(),
        `${route} has no route home from the footer`,
      ).toBeVisible();
      await expect(footer, `${route} has no copyright`).toContainText(/©\s*\d{4}/);
    }
  });

  test("the full density is unchanged on the long routes", async ({ page }) => {
    // The other half of "two densities": the long routes were not quietly
    // trimmed as well. Eight links, the bio sentence and the colophon line all
    // survive where there is room for them.
    await page.goto("/about");
    const nav = page.getByRole("navigation", { name: "Footer" });
    await expect(nav.getByRole("link")).toHaveCount(8);
    await expect(page.getByRole("contentinfo")).toContainText("Built with Astro");
    await expect(page.getByRole("contentinfo")).toContainText(
      "AI evaluation and reliability",
    );
  });
});
