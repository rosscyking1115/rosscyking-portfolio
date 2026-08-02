import { expect, test } from "@playwright/test";

/**
 * The design spec's own values, asserted against the running site.
 *
 * ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
 * The spec (docs/DESIGN-SPEC-README.md) says it is "high-fidelity … final and
 * specified to the hex/px. Recreate pixel-accurately." Nine routes were built
 * from the mock alone before that document arrived, and every value below was
 * wrong or absent in the result:
 *
 *   a third text level that did not exist, so all prose sat at the label colour
 *   an accent hover that was never declared, so filled buttons never darkened
 *   status tokens as 4px rectangles where the spec draws 99px pills
 *   a chip whose selected state was a 10% tint where the spec fills it solid
 *   a button 12px too tall, 3px too round and 2px too large
 *   the reading state carrying a 1px shadow where the spec gives 6/20/-8
 *
 * None of that was visible to any gate, because a design specification is not
 * behaviour and nothing in the suite had ever read one. This is the gate that
 * reads it: every number here is copied from the spec's tables, and a value
 * that drifts fails before anyone has to compare a screenshot to a document.
 */

/** Colour, from the spec's two palette tables. */
const PALETTE = {
  light: {
    "--background": "#fafafb",
    "--foreground": "#1c1e22",
    "--body": "#3f434a",
    "--muted-foreground": "#5c6068",
    "--border": "#e2e3e7",
    "--instrument-reading-border": "#cdd0d6",
    "--instrument-chrome": "#f0f1f3",
    "--primary": "#3d5a73",
    "--primary-hover": "#324b60",
    "--state-live": "#3f9a5f",
  },
  dark: {
    "--background": "#151619",
    "--foreground": "#e7e8ea",
    "--muted-foreground": "#9ca0a8",
    "--border": "#2e3035",
    "--instrument-reading-border": "#3a3d43",
    "--instrument-reading-surface": "#212327",
    "--instrument-chrome": "#1a1c20",
    "--primary": "#8fa9c2",
    "--state-live": "#66b587",
  },
} as const;

/** Radius, by role. The spec ties each value to a kind of thing. */
const RADII = {
  "--radius-control": "5px",
  "--radius-panel": "6px",
  "--radius-card": "8px",
  "--radius-pill": "99px",
} as const;

test.describe("design spec — tokens", () => {
  for (const [scheme, tokens] of Object.entries(PALETTE)) {
    test(`${scheme} palette matches the spec table`, async ({ browser }) => {
      const context = await browser.newContext({
        colorScheme: scheme as "light" | "dark",
      });
      await context.addCookies([
        { name: "theme", value: scheme, domain: "localhost", path: "/" },
      ]);
      const page = await context.newPage();
      await page.goto("/");

      const resolved = await page.evaluate((names: string[]) => {
        const root = getComputedStyle(document.documentElement);
        return Object.fromEntries(
          names.map((name) => [name, root.getPropertyValue(name).trim()]),
        );
      }, Object.keys(tokens));

      expect(resolved).toEqual(tokens);
      await context.close();
    });
  }

  test("the radius scale is by role, not one number with arithmetic", async ({
    page,
  }) => {
    // Before this there was a single --radius of 8px with sm/md/lg derived from
    // it, so a chip, a button, a card and a table all rounded off the same
    // value. The four the spec gives encode a hierarchy that cannot exist when
    // three of them are calculated from the fourth.
    await page.goto("/");
    const resolved = await page.evaluate((names: string[]) => {
      const root = getComputedStyle(document.documentElement);
      return Object.fromEntries(
        names.map((name) => [name, root.getPropertyValue(name).trim()]),
      );
    }, Object.keys(RADII));
    expect(resolved).toEqual(RADII);
  });

  test("the reading state carries the spec's shadow, not a hairline", async ({
    page,
  }) => {
    // `0 6px 20px -8px rgb(0 0 0 / .12)`. The instrument shipped with
    // --shadow-xs, a 1px hairline, so a reading row in light was marked by its
    // border alone. The right value was already in the file under a name
    // nothing pointed at.
    await page.goto("/projects");
    const shadow = await page
      .locator("[data-instrument][data-reading]")
      .first()
      .evaluate((el) => getComputedStyle(el).boxShadow);
    expect(shadow).toContain("6px");
    expect(shadow).toContain("20px");
  });
});

test.describe("design spec — components", () => {
  test("the button is the spec's control, not shadcn's", async ({ page }) => {
    // radius 5px, padding 7px 13px, Geist 500 12px, hover #324b60.
    await page.goto("/");
    const button = page.getByRole("link", { name: "View projects" });

    const box = await button.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        radius: style.borderTopLeftRadius,
        padY: style.paddingTop,
        padX: style.paddingLeft,
        size: style.fontSize,
        weight: style.fontWeight,
      };
    });
    expect(box).toEqual({
      radius: "5px",
      padY: "7px",
      padX: "13px",
      size: "12px",
      weight: "500",
    });
  });

  test("status tokens are pills, and ARCHIVED is the only dashed one", async ({
    page,
  }) => {
    // "LIVE (dot), RUN LOG (solid border), ARCHIVED (dashed border)" — and the
    // dashed border is #cdd0d6, not the hairline. A dashed hairline is almost
    // invisible; the spec picks the darker of the two on purpose.
    await page.goto("/projects");

    const tokens = await page
      .locator("[data-instrument] span")
      .filter({ hasText: /^(LIVE|RUN LOG|ARCHIVED)$/ })
      .evaluateAll((els) =>
        els.map((el) => {
          const style = getComputedStyle(el);
          return {
            label: el.textContent?.trim(),
            radius: Number.parseFloat(style.borderTopLeftRadius),
            style: style.borderTopStyle,
            colour: style.borderTopColor,
          };
        }),
      );
    expect(tokens.length).toBeGreaterThan(0);

    for (const token of tokens) {
      expect(token.radius, `${token.label} is not a pill`).toBeGreaterThanOrEqual(99);
      if (token.label === "ARCHIVED") {
        expect(token.style).toBe("dashed");
        expect(token.colour).toBe("rgb(205, 208, 214)");
      } else {
        expect(token.style, `${token.label} should not be dashed`).toBe("solid");
      }
    }
  });

  test("the header carries a progress hairline that never transitions", async ({
    page,
  }) => {
    // The one continuous element the motion contract permits, and permitted
    // because it is not an animation: "a position readout, not an animation —
    // it has no transition and it stays on under reduced motion."
    await page.goto("/projects");

    const bar = page.locator("[data-progress]");
    await expect(bar).toHaveCount(1);

    const style = await bar.evaluate((el) => {
      const computed = getComputedStyle(el);
      return {
        height: computed.height,
        transition: computed.transitionDuration,
        timeline: computed.animationTimeline,
      };
    });
    expect(style.height).toBe("1px");
    expect(style.transition, "the readout has a transition — it will lag").toBe("0s");
    expect(style.timeline).not.toBe("auto");
  });

  test("a CONTROLLED result shows its control beside it", async ({ page }) => {
    // "CONTROLLED — result vs control, side by side." Built first as the result
    // alone with a pill beside it, which is the shape the mode exists to
    // reject: redteam-foundry's own write-up says "a negative result only means
    // something if the pipeline can detect a positive."
    await page.goto("/projects");
    const row = page.locator(
      '[data-instrument]:has(a[href="/projects/redteam-foundry"])',
    );
    await expect(row).toContainText("0–4%");
    await expect(
      row,
      "the positive control is not shown beside the null result",
    ).toContainText("80%");
  });
});
