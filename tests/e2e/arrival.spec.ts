import { expect, test, type Page } from "@playwright/test";

import registry from "../../content/projects/registry.json" with { type: "json" };

/**
 * The arrival sequence (motion contract, amended 2 August 2026).
 *
 * ── WHY THIS FILE EXISTS AT ALL ──────────────────────────────────────────────
 * tests/e2e/motion.spec.ts used to read the home page at any moment, because
 * nothing on it moved. It now waits for the page to settle before asserting —
 * which is correct, and which leaves the entire arrival unexamined. Everything
 * interesting about an arrival happens in the window that file now skips.
 *
 * So the split is: that file owns the page AT REST, this one owns the page
 * ARRIVING. Neither is optional. A reveal that never finishes, a card that
 * replays on every lens switch, a counter that starts at zero and stays there
 * for a reader with no JavaScript — none of those are visible to a settled-page
 * sweep, and every one of them is a way this feature ships broken while looking
 * fine in review.
 *
 * ── THE FOUR THINGS WORTH GATING ─────────────────────────────────────────────
 *   1. IT HAPPENS.        The masthead is hidden, then it is not.
 *   2. IT HAPPENS ONCE.   Scrolling back, and switching lens, do not replay it.
 *                         This is the defect that killed the previous entrance
 *                         three times over.
 *   3. IT IS SKIPPABLE.   No JavaScript, or reduced motion, and the page is the
 *                         finished article — not a blank column.
 *   4. IT COSTS NOTHING.  The count-up cannot move the layout.
 */

interface ProjectSpec {
  status: string;
  demo: string | null;
  metrics?: Record<string, string>;
}

const projects = Object.values(registry.projects) as ProjectSpec[];
const shipped = projects.filter((p) => p.status === "shipped");
const expectedTests = shipped.reduce((sum, project) => {
  for (const [label, value] of Object.entries(project.metrics ?? {})) {
    if (!/test/i.test(label)) continue;
    const n = Number.parseInt(String(value).replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n)) sum += n;
  }
  return sum;
}, 0);

const FINAL_FIGURES = [
  String(shipped.length),
  expectedTests.toLocaleString("en-GB"),
  String(shipped.filter((p) => p.demo).length),
];

/**
 * What "it has stopped moving" looks like to getComputedStyle.
 *
 * NOT the string "none". A finished animation with `fill: both` keeps applying
 * its end frame, so an element whose arrival ends at `transform: none` reports
 * the identity matrix instead. Asserting the literal string failed four cases
 * against completely correct code on the first run of this file — the sort of
 * failure that reads as "the feature is broken" when it means "the assertion
 * was written from memory rather than from the platform".
 */
const SETTLED = /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/;

/** Walk the page in half-viewport steps, giving the observer a frame each time. */
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  });
}

test.describe("arrival — the masthead sequence", () => {
  test("the headline is three chunks that arrive in order, and still reads as one sentence", async ({
    page,
  }) => {
    await page.goto("/");

    const chunks = page.locator("main h1 [data-enter]");
    await expect(chunks).toHaveCount(3);
    await expect(chunks).toHaveText(["I work on", "AI evaluation", "and reliability."]);

    // THE SPACES ARE THE ASSERTION. Written as three spans on three lines with
    // no explicit separator, the compiler emits `</span><span>` and the heading
    // reads "I work onAI evaluationand reliability." — which looks like a
    // wrapping quirk in a screenshot and is a missing character in the <h1>,
    // the accessible name and every share card.
    await expect(page.locator("main h1")).toHaveText(
      "I work on AI evaluation and reliability.",
    );

    // The beat between them, read off the declared delay rather than raced
    // against. Sampling opacity mid-flight would test the scheduler; this tests
    // the design — three arrivals, 110ms apart, in reading order.
    const delays = await chunks.evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).animationDelay),
    );
    expect(delays).toEqual(["0s", "0.11s", "0.22s"]);
  });

  test("every chunk ends fully visible and in place", async ({ page }) => {
    await page.goto("/");

    // `toHaveCSS` polls, so this is the settled state and not a snapshot of
    // whichever frame the assertion happened to land on — the mistake that has
    // now been made three times in this suite against correct code.
    for (const chunk of await page.locator("main h1 [data-enter]").all()) {
      await expect(chunk).toHaveCSS("opacity", "1");
      await expect(chunk).toHaveCSS("transform", SETTLED);
    }
  });
});

test.describe("arrival — the proof figures count", () => {
  test("each figure reaches its registry value", async ({ page }) => {
    await page.goto("/");

    const figures = page.locator("[data-proof-strip] [data-count-to]");
    await expect(figures).toHaveCount(3);
    // Recomputed from registry.json, so this stays true as projects are added
    // — and still fails if the count-up overshoots, rounds, or stops short.
    await expect(figures).toHaveText(FINAL_FIGURES);
  });

  test("counting cannot move the page", async ({ page }) => {
    await page.goto("/");

    // The figure's width changes by three characters as it counts from 0 to
    // 7,264. That is only harmless because the label below it is `block` and
    // sits on its own line — a structural fact, not a lucky one, and exactly
    // the kind of thing a later "tidy-up" turns into a layout shift.
    //
    // Measured against the LABEL's position, because that is the thing a
    // reflowing figure would push.
    const label = page.locator("[data-proof-strip] dd span").nth(1);
    const before = await label.boundingBox();
    await expect(page.locator("[data-proof-strip] [data-count-to]").first()).toHaveText(
      FINAL_FIGURES[0]!,
    );
    const after = await label.boundingBox();
    expect(after?.x).toBe(before?.x);
    expect(after?.y).toBe(before?.y);
  });
});

test.describe("arrival — the featured rack, once and only once", () => {
  test("cards are held until they are reached, then released", async ({ page }) => {
    await page.goto("/");

    const cards = page.locator('[data-lens-panel="all"] [data-rack] article');
    await expect(cards).toHaveCount(registry.lenses.all.featured.length);

    // Nothing below the fold has arrived yet. The LAST card is used rather than
    // the first, because the first is close enough to the fold that a tall
    // viewport can legitimately have released it already.
    await expect(cards.last()).not.toHaveAttribute("data-shown", "");
    await expect(cards.last()).toHaveCSS("opacity", "0");

    await scrollThrough(page);

    for (const card of await cards.all()) {
      await expect(card).toHaveAttribute("data-shown", "");
      await expect(card).toHaveCSS("opacity", "1");
      await expect(card).toHaveCSS("transform", SETTLED);
    }
  });

  test("scrolling back up does not replay it", async ({ page }) => {
    // THE DEFECT THAT KILLED THE PREVIOUS ENTRANCE. It was a `view()` timeline,
    // which is SCRUBBED — progress is the scroll position, so scrolling up runs
    // it backwards and the cards fade out again on the way home. No test caught
    // it; a person scrolling up did.
    await page.goto("/");
    await scrollThrough(page);

    const cards = page.locator('[data-lens-panel="all"] [data-rack] article');
    await expect(cards.last()).toHaveCSS("opacity", "1");

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(600); // longer than one arrival, deliberately

    for (const card of await cards.all()) {
      await expect(card).toHaveCSS("opacity", "1");
      await expect(card).toHaveAttribute("data-shown", "");
    }
  });

  test("switching lens and switching back does not replay it", async ({ page }) => {
    // The second half of the same defect, and the one the old system needed a
    // workaround for: a hidden lens panel is display:none, so its animation had
    // never run, and revealing the panel replayed the entrance for every card.
    // A filter is not a navigation and the showcase must not flash on a click.
    await page.goto("/");
    await scrollThrough(page);

    const aiLens = registry.lenses.ai.label;
    const allLens = registry.lenses.all.label;

    await page.getByRole("button", { name: aiLens }).click();
    await scrollThrough(page);
    const aiCards = page.locator('[data-lens-panel="ai"] [data-rack] article');
    await expect(aiCards.first()).toHaveAttribute("data-shown", "");

    await page.getByRole("button", { name: allLens }).click();
    // No wait and no scroll: if the cards were going to replay, they would be
    // at zero opacity the instant the panel is shown.
    for (const card of await page
      .locator('[data-lens-panel="all"] [data-rack] article')
      .all()) {
      await expect(card).toHaveCSS("opacity", "1");
    }
  });
});

test.describe("arrival — it is always skippable", () => {
  test("reduced motion gets the finished page, with nothing hidden", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");

    // No `data-motion`, so not one rule in the ARRIVAL block applies — which is
    // why this asserts the ATTRIBUTE as well as the result. A page that looked
    // right because the animations happened to be instant would pass the second
    // check and fail the first.
    await expect(page.locator("html")).not.toHaveAttribute("data-motion", "");

    for (const chunk of await page.locator("main h1 [data-enter]").all()) {
      await expect(chunk).toHaveCSS("opacity", "1");
    }
    await expect(
      page.locator('[data-lens-panel="all"] [data-rack] article').last(),
    ).toHaveCSS("opacity", "1");
    await expect(page.locator("[data-proof-strip] [data-count-to]")).toHaveText(
      FINAL_FIGURES,
    );
    await context.close();
  });

  test("no JavaScript gets the finished masthead and the real numbers", async ({
    browser,
  }) => {
    // The failure this exists for: "hide it in CSS, reveal it with JS" ships a
    // blank column to anyone the script does not run for. The gate is inverted
    // here — nothing is hidden until the script says it may be — and this is
    // what proves the inversion actually holds end to end.
    //
    // The featured rack is deliberately NOT asserted: the lens panels are shown
    // by NarrowingScript, so without JavaScript that section has been absent
    // since long before this change. It is a real limitation, it predates the
    // arrival, and pretending otherwise here would hide it.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");

    await expect(page.locator("main h1")).toHaveText(
      "I work on AI evaluation and reliability.",
    );
    for (const chunk of await page.locator("main h1 [data-enter]").all()) {
      await expect(chunk).toHaveCSS("opacity", "1");
      await expect(chunk).toHaveCSS("transform", SETTLED);
    }

    // Counted from the registry and rendered by the server. If the markup ever
    // ships a zero for the script to animate away from, this is what fails.
    await expect(page.locator("[data-proof-strip] [data-count-to]")).toHaveText(
      FINAL_FIGURES,
    );
    await context.close();
  });
});
