import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

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
 * REDUCED MOTION IS SET ON PURPOSE, and it is not a way of dodging anything.
 * Cards below the fold sit at opacity 0 until GSAP resolves them on scroll,
 * and axe blends opacity into the foreground colour before measuring — so an
 * un-scrolled card reports its body text at 1.13:1 against the page. That is a
 * measurement of a transient animation frame, not of the design. With reduced
 * motion MotionScript returns early and hides nothing, so every element is
 * scanned at the state it actually settles in — which is also exactly the state
 * a reduced-motion visitor sees for the whole visit.
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

const ROUTES = [
  { path: "/", name: "home" },
  { path: "/projects", name: "projects index" },
  { path: "/projects/agent-release-gates", name: "project write-up" },
  { path: "/about", name: "about" },
  { path: "/contact", name: "contact" },
  { path: "/no-such-page-exists", name: "404" },
];

/** Only the two densest pages are re-scanned in dark, to keep the run short. */
const DARK_ROUTES = ROUTES.filter(
  (route) => route.path === "/" || route.path === "/about",
);

for (const theme of ["light", "dark"] as const) {
  const routes = theme === "light" ? ROUTES : DARK_ROUTES;

  for (const route of routes) {
    test(`${route.name} has no unexpected axe violations (${theme})`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        colorScheme: theme,
        reducedMotion: "reduce",
      });
      // The site's own toggle wins over the OS, and it reads a cookie — so set
      // the cookie too, or a `system` visitor is the only case ever scanned.
      await context.addCookies([
        { name: "theme", value: theme, domain: "localhost", path: "/" },
      ]);
      const page = await context.newPage();
      await page.goto(route.path);

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
