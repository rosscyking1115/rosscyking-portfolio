import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { ROUTES as ALL_ROUTES, routeName } from "./routes";

/**
 * Automated accessibility gate.
 *
 * `@axe-core/playwright` has been a devDependency since the migration and the
 * CI job is named "Playwright (E2E + a11y)", but nothing in the suite ever
 * imported it — so the a11y half of that job name was aspirational. This file
 * makes the name true.
 *
 * Axe is a floor, not a ceiling: it catches roughly a third of WCAG issues and
 * says nothing about whether a focus ring is on the right element or whether a
 * layout is usable at 320px. It is worth having anyway, because the third it
 * does catch is the third that regresses silently — a colour token nudged past
 * 4.5:1, a heading level skipped, a control that loses its accessible name.
 *
 * Both themes, because the palette is the most likely thing to regress and the
 * dark tokens are a separate set of values.
 *
 * THE SCAN RUNS ON THE PAGE AS LOADED, AND IT STILL DOES — WITH ONE WAIT.
 *
 * The history is worth keeping because the amendment nearly repeated it. This
 * file used to set `reducedMotion: "reduce"`, for a defensible reason: cards
 * below the fold sat at opacity 0 until their scroll-driven reveal ran, axe
 * blends opacity into the foreground colour before measuring, and an
 * un-scrolled card reported its body text at 1.13:1 against the page — a
 * measurement of a transient animation frame rather than of the design.
 *
 * It was a workaround, and it left a gap the design spec names directly:
 * contrast is "graded on the page AS LOADED — a state that only becomes
 * legible under reduced motion still fails". When §01 removed all motion, the
 * flag went with it.
 *
 * The 2 Aug 2026 amendment brought an arrival back, and this failed again in
 * exactly the old shape: the third headline chunk measured 1.25:1 — #dde2e6 on
 * #fafafb — because axe reached it 300ms in, halfway through its fade. The
 * MOTION CONTRACT block predicted this and said the reduced-motion flag would
 * have to come back for the home page.
 *
 * IT DID NOT, and that prediction is corrected there rather than quietly
 * dropped. The flag grades a page the visitor never sees; waiting grades the
 * page they do. `settled()` below waits for every document-timeline animation
 * to finish and then scans normally — so the arrival is not disabled, it is
 * simply over, and "as loaded" stays true for every route including this one.
 * Measured: 1 violation without the wait, 0 with it, 0 under the old flag.
 *
 * Do not reach for `reducedMotion` to make a violation go away: a violation
 * that only appears without it is a real one.
 */

/**
 * Violations that are known, understood and deliberately not fixed here.
 *
 * Asserted by value rather than filtered out. An exclusion would go quiet the
 * moment the underlying problem changed shape; this fails if the finding moves,
 * grows, shrinks, or is fixed — any of which should be looked at.
 *
 * SHIKI COMMENT CONTRAST. `github-light-default` sets comment tokens to
 * #6E7781, and `.doc pre` puts them on --muted (#f0f1f3): 4.02:1, against a
 * 4.5:1 threshold. It predates this suite and is not a portfolio-design
 * decision — GitHub's theme assumes a pure-white editor background, where the
 * same colour scrapes 4.56:1, so no change to the code block's own surface
 * fixes it properly. Moving off the theme, or overriding the comment token,
 * is a call about how code reads across every write-up on the site.
 * Dark mode is unaffected: #8B949E on #212327 is 5.12:1.
 */
const KNOWN: Record<string, string[]> = {
  "project write-up|light": [
    "color-contrast: 2 node(s) — Elements must meet minimum color contrast ratio thresholds",
  ],
};

/**
 * DERIVED, not listed. See tests/e2e/routes.ts — three gates each carried their
 * own hardcoded route list, and none of them noticed when /privacy and
 * /colophon shipped. A list written by hand cannot fail for a page that is not
 * on it.
 */
const ROUTES = ALL_ROUTES.map((path) => ({ path, name: routeName(path) }));

/**
 * Only the densest pages are re-scanned in dark, to keep the run short.
 *
 * Home and About are the two with the most distinct token usage. The two new
 * pages join them because they are the ones whose contrast has never been
 * checked in either theme, which is the whole reason this file changed.
 */
const DARK_ROUTES = ROUTES.filter((route) =>
  ["/", "/about", "/privacy", "/colophon"].includes(route.path),
);

for (const theme of ["light", "dark"] as const) {
  const routes = theme === "light" ? ROUTES : DARK_ROUTES;

  for (const route of routes) {
    test(`${route.name} has no unexpected axe violations (${theme})`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ colorScheme: theme });
      // The site's own toggle wins over the OS, and it reads a cookie — so set
      // the cookie too, or a `system` visitor is the only case ever scanned.
      await context.addCookies([
        { name: "theme", value: theme, domain: "localhost", path: "/" },
      ]);
      const page = await context.newPage();
      await page.goto(route.path);

      // Nothing is still moving. A scroll- or view-driven animation never
      // finishes by design — its progress is the reader's scroll position — so
      // only document-timeline animations are waited on. Every route but home
      // has none and this resolves immediately.
      await page.waitForFunction(() =>
        document
          .getAnimations()
          .every(
            (animation) =>
              animation.timeline?.constructor.name !== "DocumentTimeline" ||
              animation.playState === "finished",
          ),
      );

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s) — ${v.help}`),
        `${route.name} (${theme}) — if this is a NEW violation, fix it; if a KNOWN one is gone, delete its entry`,
      ).toEqual(KNOWN[`${route.name}|${theme}`] ?? []);

      await context.close();
    });
  }
}
