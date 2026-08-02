import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

/**
 * Read rather than imported. Playwright's TS loader is ESM, where a JSON import
 * needs `with { type: "json" }` — and an import attribute in a file Prettier and
 * ESLint also parse is more moving parts than one readFileSync.
 */
const registry = JSON.parse(
  readFileSync(join(process.cwd(), "content/projects/registry.json"), "utf8"),
) as {
  projects: Record<
    string,
    {
      status?: string;
      demo?: string | null;
      headline?: { mode: string; withdrawn?: string } | null;
    }
  >;
};

/**
 * The instrument (design spec §03), tested against the dev fixture.
 *
 * The row is not on a route yet — wiring it into /projects is step 04 — so this
 * runs against src/pages/dev-fixtures/[name].astro, which renders all ten real
 * projects. Real data on purpose: the row's entire job is to turn what the
 * registry holds into three metric modes, three content states and one designed
 * empty cell, so a fixture built from invented projects would prove nothing
 * about the ten that exist.
 *
 * WHAT THESE ARE GUARDING. The designer's mock filled the two authored cells by
 * inference and got three things wrong: the wrong project marked ARCHIVED, a
 * test count its own footer total contradicted, and two corrections counted
 * where four write-ups carry one. Every count below is therefore DERIVED from
 * registry.json in the test itself rather than typed — if the expectation and
 * the page can only disagree by both being wrong, the test is worth having.
 */

const FIXTURE = "/dev-fixtures/instrument";

/** The states, derived here exactly as src/lib/projects.ts derives them. */
function expectedStates() {
  const counts: Record<string, number> = { LIVE: 0, "RUN LOG": 0, ARCHIVED: 0 };
  for (const spec of Object.values(registry.projects)) {
    const state =
      spec.status === "archived" ? "ARCHIVED" : spec.demo ? "LIVE" : "RUN LOG";
    counts[state] = (counts[state] ?? 0) + 1;
  }
  return counts;
}

/** Slugs whose headline is a correction, and the number each one withdrew. */
function correctedProjects(): Array<[string, { mode: string; withdrawn: string }]> {
  return Object.entries(registry.projects)
    .filter(([, spec]) => spec.headline?.mode === "CORRECTED")
    .map(([slug, spec]) => [slug, spec.headline as { mode: string; withdrawn: string }]);
}

const rowMetrics = (page: Page) =>
  page.locator("[data-instrument]").evaluateAll((rows) =>
    rows.map((row) => {
      const box = row.getBoundingClientRect();
      const style = getComputedStyle(row);
      const value = row.querySelector(".font-mono.font-semibold");
      const title = row.querySelector("h3");
      return {
        state: row.getAttribute("data-state"),
        reading: row.hasAttribute("data-reading"),
        height: Math.round(box.height),
        border: style.borderTopColor,
        background: style.backgroundColor,
        valueColour: value ? getComputedStyle(value).color : null,
        titleColour: title ? getComputedStyle(title).color : null,
        struck: row.querySelectorAll("s").length,
      };
    }),
  );

test.describe("the instrument — addressing (spec §02)", () => {
  test("receded and reading differ in colour and border, NEVER in height", async ({
    page,
  }) => {
    // The spec's one hard requirement, and the reason it is stated as one:
    // implement receding as a height change and the page shifts under the
    // reader's thumb on every scroll, which is the CLS the performance budget
    // calls "the one live risk". Asserted two ways — every row is the same
    // height as every other, AND forcing the reading treatment onto a receded
    // row moves nothing.
    await page.goto(FIXTURE);
    const rows = await rowMetrics(page);
    expect(rows.length).toBe(Object.keys(registry.projects).length);

    const heights = [...new Set(rows.map((row) => row.height))];
    expect(
      heights,
      `rows render at ${heights.join("/")}px — they must be identical`,
    ).toHaveLength(1);

    const shift = await page
      .locator("[data-instrument]")
      .first()
      .evaluate((row) => {
        const before = row.getBoundingClientRect().height;
        row.classList.add("border-instrument-reading-border", "bg-instrument-reading");
        const after = row.getBoundingClientRect().height;
        row.classList.remove("border-instrument-reading-border", "bg-instrument-reading");
        return after - before;
      });
    expect(shift, "addressing a row changed its height").toBe(0);

    // And the two states are genuinely distinguishable, or the rule above is
    // satisfied by doing nothing at all.
    const reading = rows.find((row) => row.reading)!;
    const receded = rows.find((row) => !row.reading)!;
    expect(reading.border).not.toBe(receded.border);
    expect(reading.background).not.toBe(receded.background);
  });

  test("a receded row is two levels, not one: the metric never dims", async ({
    page,
  }) => {
    // §02, verbatim: "a plain metric is foreground exactly like a corrected
    // one. Corrections are distinguished by the struck pair and the accent
    // pill, never by being the only legible number." Dim the LIMITS rows and
    // the page quietly argues that only the corrections are worth reading.
    await page.goto(FIXTURE);
    const rows = await rowMetrics(page);
    const foreground = await page.evaluate(() => getComputedStyle(document.body).color);

    for (const row of rows) {
      if (!row.valueColour) continue; // the archived row has no value to dim
      expect(row.valueColour, "a headline value is not at full foreground").toBe(
        foreground,
      );
    }

    // The title is the half that DOES recede, so the two levels are real.
    const reading = rows.find((row) => row.reading)!;
    const receded = rows.find((row) => !row.reading)!;
    expect(receded.titleColour).not.toBe(reading.titleColour);
  });

  test("keyboard focus addresses a row exactly as a pointer does", async ({ page }) => {
    // §02 lists focus as an addressing input in its own right, so a keyboard
    // user is not left reading ten identical rows. Compared against the SAME
    // row before and after focus, not against a neighbour.
    await page.goto(FIXTURE);
    const row = page.locator("[data-instrument]").first();
    const read = () =>
      row.evaluate((el) => {
        const style = getComputedStyle(el);
        return `${style.borderTopColor}|${style.backgroundColor}`;
      });

    const resting = await read();
    await row.locator("a").focus();

    // POLLED, not read once. Addressing is a 160ms transition, so a synchronous
    // read straight after .focus() samples the START of the tween and reports
    // the resting colour — which failed this test against a component that was
    // working correctly. The same trap caught a theme-toggle measurement
    // earlier in this pass; anything with `transition-[border-color]` on it has
    // to be waited for, not sampled.
    await expect
      .poll(read, { message: "focus did not force the reading state" })
      .not.toBe(resting);
  });

  test("the whole row is the touch target, at 44px or more", async ({ page }) => {
    // §05 TOUCH: "44px minimum, whole row is the target, never just the arrow."
    await page.goto(FIXTURE);
    const boxes = await page.locator("[data-instrument] a").evaluateAll((links) =>
      links.map((link) => {
        // The hit area is the stretched ::after, which covers the whole row.
        const row = link.closest("[data-instrument]")!.getBoundingClientRect();
        return { width: Math.round(row.width), height: Math.round(row.height) };
      }),
    );
    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) expect(box.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe("the instrument — modes and states (spec §03 R5, R6)", () => {
  test("every project resolves to exactly one content state, derived", async ({
    page,
  }) => {
    // Would have caught the mock's first error: community-energy-flex shown as
    // ARCHIVED when it is shipped with a live demo, while the genuinely
    // archived marketing-effectiveness-lab was shown live. The counts come
    // from registry.json here, so the page and the expectation cannot drift
    // apart without one of them being wrong about the same file.
    await page.goto(FIXTURE);
    const rendered: Record<string, number> = {};
    for (const row of await rowMetrics(page)) {
      rendered[row.state!] = (rendered[row.state!] ?? 0) + 1;
    }
    expect(rendered).toEqual(expectedStates());
  });

  test("every correction shows the number it replaced, and nothing else does", async ({
    page,
  }) => {
    // Would have caught the mock's third error: "2 corrected" where four
    // write-ups carry a retraction. Half a correction — the new number with no
    // sign of the old — is just a confident number, so the struck pair is the
    // thing being asserted rather than the pill.
    await page.goto(FIXTURE);
    const corrected = correctedProjects();
    expect(corrected.length, "no corrections in the registry at all").toBeGreaterThan(0);

    const rows = await rowMetrics(page);
    const struckRows = rows.filter((row) => row.struck > 0);
    expect(
      struckRows.length,
      `${struckRows.length} struck pairs rendered for ${corrected.length} corrections`,
    ).toBe(corrected.length);

    // Each withdrawn value is on the page, and readable rather than decorative:
    // a line-through carries no meaning to a screen reader, so the relationship
    // is spelled out in text.
    for (const [slug, headline] of corrected) {
      const row = page.locator(`[data-instrument]:has(a[href="/projects/${slug}"])`);
      await expect(row.locator("s"), `${slug} has no struck value`).toHaveText(
        headline.withdrawn,
      );
      await expect(row).toContainText(`Withdrawn: ${headline.withdrawn}`);
    }
  });

  test("the project with no metric says so, rather than leaving a blank", async ({
    page,
  }) => {
    // Would have caught the mock's filled-in cell: it gave the archived project
    // a headline of "Bayesian / posterior layer", a phrase lifted from the
    // summary rather than a measurement. A blank cell and an unfilled one look
    // identical, which is the defect AGENTS.md records three times over — so
    // the empty state has to say WHY it is empty.
    await page.goto(FIXTURE);
    const [slug] = Object.entries(registry.projects).find(
      ([, spec]) => spec.headline === null,
    )!;

    const row = page.locator(`[data-instrument]:has(a[href="/projects/${slug}"])`);
    await expect(row).toContainText("no metric published");
    await expect(row.locator("[data-state]").or(row)).toHaveAttribute(
      "data-state",
      "ARCHIVED",
    );
  });

  test("no fourth mode has appeared, and every mode is spoken in full", async ({
    page,
  }) => {
    // R5 is three modes and an explicit instruction never to fabricate a
    // correction to fill the slot. The mock reached for a fourth — RECORDED —
    // to fill the archived row, so this fails if a fourth shows up.
    //
    // Reads the visible label off the aria-hidden span rather than the token's
    // textContent, which also carries the screen-reader sentence: the first cut
    // of this test compared against "Corrected: a published number was
    // withdrawn and replacedCORRECTED" and told me nothing.
    await page.goto(FIXTURE);
    const tokens = await page
      .locator("[data-instrument] [title] > [aria-hidden='true']")
      .evaluateAll((els) => els.map((el) => el.textContent?.trim()));

    expect(tokens.length, "no metric modes rendered at all").toBeGreaterThan(0);
    for (const mode of tokens) {
      expect(["CORRECTED", "CONTROLLED", "LIMITS"]).toContain(mode);
    }

    // Eight letters of mono is not a definition, so each token carries one for
    // assistive tech and on hover. Asserted because an sr-only string is
    // invisible in review and would rot without anyone noticing.
    const spoken = await page
      .locator("[data-instrument] [title] .sr-only")
      .evaluateAll((els) => els.map((el) => el.textContent?.trim()));
    expect(spoken.length).toBe(tokens.length);
    for (const line of spoken) expect(line).toMatch(/^(Corrected|Controlled|Limits): /);
  });
});

test.describe("the instrument — both themes", () => {
  /**
   * THE TWO THEMES ANSWER FINDING 07 DIFFERENTLY, and the first cut of this
   * test asserted the dark answer in both — "the reading row must not share the
   * page background" — which failed against a correct implementation in light.
   * That is the assertion encoding a wrong claim, not the component misbehaving.
   *
   * §02's state table is explicit that the two are asymmetric. In LIGHT a
   * reading row keeps the page surface and is marked by a darker border plus a
   * shadow. In DARK it cannot be a shadow — #151619 has nothing to cast into,
   * which was finding 07 — so the surface itself lifts and the shadow is
   * dropped. So each theme is checked against the answer it actually gives,
   * and both are checked for the one thing that must hold either way.
   */
  for (const scheme of ["light", "dark"] as const) {
    test(`${scheme}: reading is distinguishable from receded`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme: scheme });
      await context.addCookies([
        { name: "theme", value: scheme, domain: "localhost", path: "/" },
      ]);
      const page = await context.newPage();
      await page.goto(FIXTURE);

      const { pageBackground, reading, receded } = await page.evaluate(() => {
        const rows = [...document.querySelectorAll("[data-instrument]")];
        const read = (el: Element) => {
          const style = getComputedStyle(el);
          return {
            background: style.backgroundColor,
            border: style.borderTopColor,
            shadow: style.boxShadow,
          };
        };
        return {
          pageBackground: getComputedStyle(document.body).backgroundColor,
          reading: read(rows.find((row) => row.hasAttribute("data-reading"))!),
          receded: read(rows.find((row) => !row.hasAttribute("data-reading"))!),
        };
      });

      // True in both themes, and the minimum the whole system rests on.
      expect(reading.border, "reading and receded share a border colour").not.toBe(
        receded.border,
      );

      if (scheme === "dark") {
        // The lift, because a shadow would be invisible here.
        expect(
          reading.background,
          "dark: the reading row shares the page surface — finding 07 is back",
        ).not.toBe(pageBackground);
        expect(reading.shadow, "dark: a shadow that cannot be seen").toBe("none");
      } else {
        // The shadow, because the surface is already the page's.
        expect(reading.shadow, "light: the reading row casts no shadow").not.toBe("none");
        expect(receded.shadow, "light: a receded row is casting a shadow").toBe("none");
      }
      await context.close();
    });
  }
});

test.describe("the reading line — addressing without a pointer (spec §02)", () => {
  /**
   * §02's third addressing input, and the only one a phone has.
   *
   * The spec's own risk note on this direction is the reason it exists:
   * "hover-driven emphasis has no touch equivalent, and most of your traffic is
   * a phone. Mobile needs a different rule, not a fallback." So it is scoped to
   * `(hover: none)` — a different rule for devices with no pointer, rather than
   * a degraded version of the pointer rule — and on a desktop it never applies
   * at all, which is what stops a running animation and a `:hover` declaration
   * fighting over the same two properties.
   *
   * It is a scroll-driven ANIMATION, which the motion contract used to ban
   * outright. The ban was narrowed rather than waived: what §01 forbids is a
   * reveal, so the rule now sits on the two properties that make an animation a
   * reveal (opacity, transform) instead of on the timeline that drives it.
   * tests/e2e/motion.spec.ts reads the live keyframes off getAnimations() and
   * fails if this ever touches either.
   */
  const phone = { width: 390, height: 844 };

  test("on touch, exactly one row reads, and scrolling moves which", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: phone,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto("/projects");

    const litAt = (top: number) =>
      page.evaluate(async (y) => {
        // `behavior: "instant"` is REQUIRED, and finding out why cost an hour.
        // global.css sets `scroll-behavior: smooth` on <html>, so a plain
        // scrollTo animates — and reading two frames later samples the scroll
        // 43px in rather than at its destination. Every row looked receded and
        // the reading line looked broken when it was working correctly. Third
        // time this pass that a synchronous read caught a tween mid-flight.
        window.scrollTo({ top: y, behavior: "instant" });
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
        const receded = getComputedStyle(document.documentElement)
          .getPropertyValue("--border")
          .trim();
        const hex = (value: string) => {
          const [r, g, b] = value.match(/\d+/g)!.map(Number);
          return `#${[r, g, b].map((n) => n!.toString(16).padStart(2, "0")).join("")}`;
        };
        return [...document.querySelectorAll("[data-instrument]")]
          .map((row, index) => ({
            index,
            border: hex(getComputedStyle(row).borderTopColor),
          }))
          .filter((row) => row.border !== receded)
          .map((row) => row.index);
      }, top);

    const sweep: number[][] = [];
    for (const top of [450, 600, 900, 1050, 1200, 1500, 1650, 2100, 2250]) {
      sweep.push(await litAt(top));
    }

    // AT MOST ONE. The lit band is ~55px of scroll against a row pitch of 89px,
    // so two rows can never be inside it together — that is the geometry the
    // band width was chosen for, asserted rather than assumed.
    for (const [i, lit] of sweep.entries()) {
      expect(lit.length, `${lit.length} rows addressed at sample ${i}`).toBeLessThan(2);
    }

    // AND IT MOVES. A reading line that never changes which row it addresses is
    // indistinguishable from a static highlight.
    const distinct = new Set(sweep.flat());
    expect(
      distinct.size,
      `only ${distinct.size} row(s) ever addressed across the whole scroll`,
    ).toBeGreaterThan(3);

    await context.close();
  });

  test("a pointer device gets the hover rule instead, not both", async ({ browser }) => {
    // The failure this guards is silent and only visible on a desktop: an
    // animation beats a plain declaration in the cascade, so a reading line
    // running here would quietly disable `:hover` on every row.
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto("/projects");

    const running = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.timeline &&
              animation.timeline.constructor.name !== "DocumentTimeline",
          ).length,
    );
    expect(running, "the reading line is running on a pointer device").toBe(0);

    await context.close();
  });
});
