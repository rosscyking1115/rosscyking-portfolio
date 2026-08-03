import { expect, test, type Page } from "@playwright/test";

import { ROUTES } from "./routes";

/**
 * Boxes do not intersect.
 *
 * ── WHY THIS FILE EXISTS, IN THE AUDITOR'S OWN COUNT ─────────────────────────
 * The design pass of 3 August 2026 audited 32 captures of this site and opened
 * with a scoreboard:
 *
 *     13 FINDINGS · 2 SHIPPED DEFECTS · 0 CAUGHT BY THE 311 TESTS
 *
 * The zero is the finding. One of those defects was the write-up's prev/next
 * rows: the title column rendered at THIRTY-SIX PIXELS, "redteam-foundry" broke
 * to one character per line for twelve lines, and "0–4% vs 80%" printed
 * straight through it — on the last thing a reader sees on the site's most
 * important page, in light and dark, at every width above 1024.
 *
 * The audit named the reason precisely, and it is not "there were not enough
 * tests":
 *
 *     "It survived because every gate asserts a value. None asserts that two
 *      boxes do not intersect."
 *
 * That is exactly right. This suite has 259 assertions about colours, tokens,
 * counts, attributes, headings, statuses and timings. Every one of them reads a
 * property of a single element. None of them reads the RELATIONSHIP between two,
 * which is the only place a layout failure can live — a wrong colour is a wrong
 * value, and a broken layout is two right values in the wrong places.
 *
 * ── THE FIRST VERSION OF THIS GATE DID NOT CATCH THE DEFECT ──────────────────
 * Written to the audit's own words — "two boxes do not intersect" — it swept
 * sibling bounding boxes for overlap, and with the defect deliberately
 * reintroduced it reported 24 passes. That result is kept here because it is
 * the more useful half of the exercise.
 *
 * The boxes never intersected. The title's box was 36px wide and the value
 * block began at 523px, so they sat side by side, correctly, with a gap. What
 * overlapped was the TEXT: "Prognostics" is about 90px of glyphs in a 36px box,
 * and `overflow` is `visible` by default, so the word painted straight out of
 * its own box and across its neighbour while both boxes stayed exactly where
 * the layout put them.
 *
 * So the measurable property is not intersection, it is OVERFLOW: an element
 * whose `scrollWidth` exceeds its `clientWidth` while its `overflow-x` is
 * `visible` is painting outside itself, and anything to its right is what it
 * paints onto. Both checks are kept — overlap is still a real failure mode and
 * costs nothing — but overflow is the one that fails on the defect, and it was
 * found by testing the gate rather than by reasoning about it.
 *
 * ── WHAT IT CHECKS, AND WHAT IT DELIBERATELY DOES NOT ────────────────────────
 * Text painting outside its own box, and siblings occupying the same pixels.
 * Not "does this look right" — no screenshot, no threshold anyone has to
 * maintain, and nothing that goes subtly stale as the design moves. Both are
 * true of every design this site could become, so the gate does not have to be
 * rewritten when the design changes.
 *
 * It runs at three widths on every derived route, because the defect was
 * width-dependent in a way no single viewport could show: the same component
 * was correct at 1088px and broken at 608px ON THE SAME SCREEN, because the
 * ruled columns were switched by a viewport media query while the row sat in a
 * narrow container. That is why the fix is `@container` and why this gate
 * cannot be a desktop-only check.
 */

/** The three widths the responsive gate already uses, plus the desktop measure. */
const WIDTHS = [
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 900 },
];

interface Collision {
  route: string;
  kind: "overlap" | "overflow";
  container: string;
  a: string;
  b?: string;
  detail: string;
}

/**
 * Find sibling pairs that occupy the same pixels.
 *
 * Scoped to instrument rows and card grids rather than the whole document, and
 * that scoping is a real limitation rather than an oversight: absolutely
 * positioned overlays, stretched links and decorative rules legitimately sit on
 * top of their siblings all over the site, so an unscoped sweep would report
 * dozens of intentional overlaps and be switched off within a week. A gate
 * nobody trusts is a gate nobody reads.
 *
 * So it checks the containers whose whole job is to place things beside each
 * other, and it skips any child that is out of flow.
 */
async function collisions(page: Page, route: string): Promise<Collision[]> {
  return page.evaluate((currentRoute: string) => {
    const found: Collision[] = [];

    const describe = (el: Element) => {
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 32);
      const cls = (el.getAttribute("class") ?? "").split(/\s+/).slice(0, 2).join(".");
      return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}${text ? ` "${text}"` : ""}`;
    };

    // Every element that lays its children out side by side and is part of the
    // instrument system. `[data-rack] article` catches the featured card's
    // text/frame grid; the row body catches mark / title / values / glyph.
    const containers = document.querySelectorAll(
      "[data-instrument] > div, [data-instrument] > details > summary > div, [data-rack] article",
    );

    for (const container of containers) {
      const style = getComputedStyle(container);
      if (!/flex|grid/.test(style.display)) continue;

      const children = [...container.children].filter((child) => {
        const cs = getComputedStyle(child);
        // Out-of-flow children are ALLOWED to overlap — that is what they are
        // for. The stretched card link, the absolute disclosure marker and any
        // decorative rule all live here.
        if (cs.position === "absolute" || cs.position === "fixed") return false;
        if (cs.display === "none" || cs.visibility === "hidden") return false;
        const box = child.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      });

      for (let i = 0; i < children.length; i++) {
        for (let j = i + 1; j < children.length; j++) {
          const a = children[i]!.getBoundingClientRect();
          const b = children[j]!.getBoundingClientRect();

          // A 1px tolerance, because sub-pixel layout rounds boxes into contact
          // at some zoom levels and a hairline of contact is not an overlap.
          const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (x > 1 && y > 1) {
            found.push({
              route: currentRoute,
              kind: "overlap",
              container: describe(container),
              a: describe(children[i]!),
              b: describe(children[j]!),
              detail: `${Math.round(x)}x${Math.round(y)}px`,
            });
          }
        }
      }

      // TEXT PAINTING OUTSIDE ITS OWN BOX. This is the half that fails on the
      // real defect. Scoped to `overflow-x: visible`, because a `truncate`
      // cell, a scrollable code block and a `overflow-hidden` frame all report
      // the same numbers legitimately — they have said what should happen to
      // the excess, and the browser does it.
      //
      // 2px of tolerance: a descender or an italic can push scrollWidth past
      // clientWidth by a pixel on a box that is fitting perfectly well.
      for (const child of children) {
        const cs = getComputedStyle(child);
        if (cs.overflowX !== "visible") continue;
        if (!(child instanceof HTMLElement)) continue;
        const spill = child.scrollWidth - child.clientWidth;
        if (spill > 2) {
          found.push({
            route: currentRoute,
            kind: "overflow",
            container: describe(container),
            a: describe(child),
            detail: `${spill}px wider than its box (${child.clientWidth}px)`,
          });
        }
      }
    }

    return found;
  }, route);
}

for (const viewport of WIDTHS) {
  test.describe(`no boxes intersect at ${viewport.name}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES) {
      test(`${route}`, async ({ page }) => {
        await page.goto(route);
        await page.waitForLoadState("networkidle");

        // Open every disclosure first. A closed <details> hides its panel, so
        // the bench's previews would be swept at zero height and pass without
        // being looked at — the "renders nothing is not the same as verified"
        // rule from AGENTS.md, applied to geometry.
        await page.evaluate(() => {
          for (const details of document.querySelectorAll("details[data-disclosure]")) {
            (details as HTMLDetailsElement).open = true;
          }
        });

        const found = await collisions(page, route);
        expect(
          found,
          `${route} at ${viewport.name}px: text is painting outside its box, or siblings overlap`,
        ).toEqual([]);
      });
    }
  });
}
