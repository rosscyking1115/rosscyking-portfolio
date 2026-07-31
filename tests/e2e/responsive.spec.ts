import { expect, test } from "@playwright/test";

/**
 * Responsive gate.
 *
 * This file exists because of a defect the whole suite was blind to: the home
 * page scrolled sideways at every phone width. `document.scrollWidth` was 433px
 * whether the viewport was 320, 360, 390 or 414 — a constant, so the page had a
 * hard floor it could not go under.
 *
 * The cause was three levels down. EvidenceFrame's <figure> sat inside grid
 * items with the default `min-width: auto`, and its caption is `truncate`
 * (`white-space: nowrap`) holding a full hostname at 251px, so the card could
 * not shrink below 409px and the frame's own `truncate` never got to do its
 * job. The fix is `min-w-0` on those grid items.
 *
 * NOTHING FAILED. 130 tests, and design-foundation.spec.ts drives the mobile
 * menu at exactly 390px — the same viewport where the page overflowed by 43px.
 * Every one of them asked "does this work?"; none asked "does it fit?". This is
 * the same shape as completeness.spec.ts: an assertion about the thing nobody
 * thought to look at.
 *
 * A horizontal scrollbar is also the cheapest possible signal that something
 * has a min-content floor it should not have, so this catches a whole class of
 * layout regression rather than one card.
 */

const ROUTES = [
  "/",
  "/projects",
  "/projects/agent-release-gates",
  "/about",
  "/contact",
  "/no-such-page-exists",
];

/** 320 is the narrowest viewport worth supporting; 414 is a large phone. */
const WIDTHS = [320, 390, 414];

/**
 * The second failure mode, and the one the check above cannot see.
 *
 * /projects/[slug] renders its metrics as three equal columns inside a
 * `rounded-lg overflow-hidden` wrapper. At 320px each cell is about 90px and
 * `90.91%` set in 24px mono needs 65px plus its padding — so it spilled into
 * the next cell and the wrapper CLIPPED the `%`. The page did not scroll, so
 * `scrollWidth` never moved and every viewport test passed while a headline
 * number silently read `90.91`.
 *
 * Clipping is often correct — `truncate` and `line-clamp` are deliberate, and
 * a code block with `overflow-x: auto` is scrollable rather than lost. Those
 * are excluded by the properties that make them intentional; what is left is
 * content going missing with nothing to reveal it.
 */
test.describe("no content is clipped", () => {
  for (const width of [320, 360]) {
    for (const route of ROUTES) {
      test(`${route} at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(route);

        const clipped = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>("body *")]
            .filter((el) => {
              if (el.scrollWidth <= el.clientWidth + 1) return false;
              const style = getComputedStyle(el);
              // Deliberate: ellipsis, line clamp, and anything scrollable.
              if (style.textOverflow === "ellipsis") return false;
              if (style.webkitLineClamp !== "none") return false;
              if (style.overflowX === "auto" || style.overflowX === "scroll")
                return false;
              // Visually-hidden content (`sr-only`, and the skip link until it
              // takes focus) is clipped on purpose — that IS the technique.
              // `clip` is read through getPropertyValue because the typed
              // property is deprecated, while the idiom that uses it is not.
              if (style.getPropertyValue("clip") !== "auto") return false;
              if (style.clipPath !== "none") return false;
              if (el.clientHeight <= 1) return false;
              // An element with visible overflow spills but does not lose the
              // content — unless something above it clips. Walk up and check.
              let parent = el.parentElement;
              while (parent && parent !== document.body) {
                const parentStyle = getComputedStyle(parent);
                if (
                  parentStyle.overflowX === "hidden" ||
                  parentStyle.overflowX === "clip"
                ) {
                  return true;
                }
                if (
                  parentStyle.overflowX === "auto" ||
                  parentStyle.overflowX === "scroll"
                ) {
                  return false;
                }
                parent = parent.parentElement;
              }
              return style.overflowX === "hidden" || style.overflowX === "clip";
            })
            .slice(0, 5)
            .map(
              (el) =>
                `<${el.tagName.toLowerCase()} class="${el.className}"> "${(el.textContent ?? "").trim().slice(0, 30)}" needs ${el.scrollWidth}px in ${el.clientWidth}px`,
            ),
        );

        expect(clipped, `${route} clips content at ${width}px`).toEqual([]);
      });
    }
  }
});

for (const width of WIDTHS) {
  test.describe(`at ${width}px`, () => {
    for (const route of ROUTES) {
      test(`${route} fits the viewport`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(route);

        const overflow = await page.evaluate((viewport) => {
          const scrollWidth = document.documentElement.scrollWidth;
          if (scrollWidth <= viewport + 1) return { scrollWidth, offenders: [] };
          // Name what is actually sticking out, so a failure is diagnosable
          // without re-deriving it by hand.
          const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
            .filter((el) => {
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && (rect.right > viewport + 1 || rect.left < -1);
            })
            .slice(0, 5)
            .map((el) => `<${el.tagName.toLowerCase()} class="${el.className}">`);
          return { scrollWidth, offenders };
        }, width);

        expect(
          overflow.scrollWidth,
          `${route} overflows at ${width}px. Widest offenders: ${overflow.offenders.join(" | ")}`,
        ).toBeLessThanOrEqual(width + 1);
      });
    }
  });
}
