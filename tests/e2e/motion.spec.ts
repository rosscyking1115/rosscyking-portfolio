import { expect, test, type Page } from "@playwright/test";

/**
 * The motion contract, enforced against the rendered page.
 *
 * The design spec's §01 is four bans and three durations, and every one of them
 * is invisible in review. A `hover:-translate-y-0.5` reads as a nicety in a diff;
 * a card fading in on scroll looks like polish in a screen recording. Nothing
 * 404s, nothing throws, and the system quietly stops being a system — which is
 * how this repo accumulated FOUR separate entrance mechanisms, a hover lift, an
 * arrow nudge, a padding drift and three pinging dots before anyone counted.
 *
 * So these assert the bans directly, on the page as loaded:
 *
 *   NOTHING TRANSLATES   no transform at rest, and no transition may name a
 *                        transform property
 *   NO OPACITY ON TEXT   every element carrying text is fully opaque
 *   NEVER                nothing animates on arrival, on scroll, or continuously
 *   VOCABULARY           every transition on the page uses one of the three
 *                        durations and the one easing
 *
 * See the MOTION CONTRACT block in src/styles/global.css for the reasoning, and
 * tests/unit/motion-contract.test.ts for the source-level half of this gate.
 * Both halves exist on purpose: the source scan catches a banned utility in a
 * file no route renders yet, and this catches anything that arrives from a
 * dependency, a base style or a computed default.
 */

/** Every route a visitor can reach, /contact included — it has an island. */
const ROUTES = [
  "/",
  "/projects",
  "/projects/agent-release-gates",
  "/about",
  "/contact",
] as const;

/** The three motion tokens and the one easing, as getComputedStyle reports them. */
const VOCABULARY = {
  durations: ["0.12s", "0.16s", "0.22s"],
  easing: "cubic-bezier(0.2, 0, 0, 1)",
};

/**
 * Read every element's motion-relevant computed style in one pass.
 *
 * One evaluate per page rather than one per assertion: the suite runs against
 * `astro dev` on a single worker, and four round-trips per route across five
 * routes is the kind of thing that made §6j lower the worker count.
 */
async function sweep(page: Page) {
  return page.evaluate((vocabulary: typeof VOCABULARY) => {
    /** A stable, human-readable handle for an element in a failure message. */
    const describe = (el: Element) => {
      const cls = el.getAttribute("class");
      return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${
        cls ? `.${cls.split(/\s+/).slice(0, 4).join(".")}` : ""
      }`;
    };

    const animating: string[] = [];
    const scrollDriven: string[] = [];
    const transformed: string[] = [];
    const faded: string[] = [];
    const offVocabulary: string[] = [];

    for (const el of document.querySelectorAll("*")) {
      const style = getComputedStyle(el);

      if (style.animationName !== "none") {
        animating.push(`${describe(el)} → ${style.animationName}`);
      }
      // `view()` and `scroll()` both report as something other than "auto".
      if (style.animationTimeline && style.animationTimeline !== "auto") {
        scrollDriven.push(`${describe(el)} → ${style.animationTimeline}`);
      }
      if (style.transform !== "none") {
        transformed.push(`${describe(el)} → ${style.transform}`);
      }

      // Opacity only matters where there is text to make illegible. An
      // aria-hidden dot or a decorative rule can be any opacity it likes.
      const hasText = [...el.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      );
      if (hasText && Number(style.opacity) < 1 && !el.closest("[disabled]")) {
        faded.push(`${describe(el)} → opacity ${style.opacity}`);
      }

      // Every transition on the page must speak the vocabulary. An element
      // with no transition reports `all 0s ease 0s`, which is not a violation
      // — only a NON-ZERO duration commits to a timing.
      //
      // The split has to respect parentheses. `transition-colors` expands to
      // eleven properties, so the timing-function list is eleven copies of
      // `cubic-bezier(0.2, 0, 0, 1)` — and a naive split on "," turns each one
      // into four fragments, misaligns every list, and reports the correct
      // easing as `0`, `1)` and `cubic-bezier(0.2`. Caught by this gate failing
      // on a page that was already compliant.
      const splitTop = (value: string) => {
        const parts: string[] = [];
        let depth = 0;
        let current = "";
        for (const char of value) {
          if (char === "(") depth++;
          if (char === ")") depth--;
          if (char === "," && depth === 0) {
            parts.push(current.trim());
            current = "";
          } else current += char;
        }
        parts.push(current.trim());
        return parts;
      };

      const props = splitTop(style.transitionProperty);
      const times = splitTop(style.transitionDuration);
      const eases = splitTop(style.transitionTimingFunction);
      props.forEach((prop, i) => {
        const time = times[i % times.length] ?? "0s";
        const ease = eases[i % eases.length] ?? "";
        if (time === "0s" || time === "0ms") return;
        if (/transform|translate|scale|rotate/.test(prop)) {
          offVocabulary.push(`${describe(el)} → transitions ${prop} (banned)`);
          return;
        }
        if (!vocabulary.durations.includes(time)) {
          offVocabulary.push(`${describe(el)} → ${prop} at ${time} (not a token)`);
        }
        if (ease !== vocabulary.easing) {
          offVocabulary.push(`${describe(el)} → ${prop} eased ${ease}`);
        }
      });
    }

    // Deduped: `transition-colors` expands to eleven properties, so one
    // offending class string on one repeated component produced 662 identical
    // lines and buried the finding it was reporting.
    const unique = (list: string[]) => [...new Set(list)].sort();
    return {
      animating: unique(animating),
      scrollDriven: unique(scrollDriven),
      transformed: unique(transformed),
      faded: unique(faded),
      offVocabulary: unique(offVocabulary),
    };
  }, VOCABULARY);
}

test.describe("motion contract (design spec §01)", () => {
  for (const route of ROUTES) {
    test(`${route} obeys every ban as loaded`, async ({ page }) => {
      await page.goto(route);
      // The sweep reads computed styles, so the stylesheet has to be in.
      await page.waitForLoadState("networkidle");
      const found = await sweep(page);

      // Would have caught: `.reveal` / `.reveal-on-scroll`, three `animate-ping`
      // dots, a hover lift on every card, an arrow nudge, a padding drift and a
      // screenshot zoom. One assertion per rule, so a failure names which rule
      // broke rather than "motion changed".
      expect(found.animating, "elements animating with nothing addressed").toEqual([]);
      expect(found.scrollDriven, "elements driven by a scroll timeline").toEqual([]);
      expect(found.transformed, "elements displaced from their layout position").toEqual(
        [],
      );
      expect(found.faded, "text held below full opacity").toEqual([]);
      expect(found.offVocabulary, "transitions outside the three tokens").toEqual([]);
    });
  }

  test("the page is identical with and without prefers-reduced-motion", async ({
    browser,
  }) => {
    // The spec's reduced-motion rule is "all durations 0 … every instrument
    // renders framed and complete, in order". With no arrival motion at all
    // that is not a second code path to maintain — it is the same page. This
    // asserts that equivalence rather than trusting it, because the previous
    // system HAD a reduced-motion block and still shipped a 360ms transparent
    // proof strip to anyone who asked for less motion: the block collapsed
    // `animation-duration` and never touched `animation-delay`.
    const shape = async (reducedMotion: "reduce" | "no-preference") => {
      const context = await browser.newContext({ reducedMotion });
      const page = await context.newPage();
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const result = await page.evaluate(() =>
        [...document.querySelectorAll("main *")].map((el) => {
          const style = getComputedStyle(el);
          return `${style.opacity}|${style.transform}|${style.animationName}`;
        }),
      );
      await context.close();
      return result;
    };

    expect(await shape("reduce")).toEqual(await shape("no-preference"));
  });
});

/**
 * The addressing palette (design spec §02), pinned by value in both themes.
 *
 * These have no consumer yet — the instrument itself is step 03 of the build
 * order. That is exactly why they are asserted here: an unused token is the
 * easiest thing in the file to typo, delete or half-define, and without this it
 * would fail for the first time inside whatever gets built on top of it.
 */
const ADDRESSING = {
  light: {
    "--instrument-reading-surface": "#fafafb",
    "--instrument-reading-border": "#cdd0d6",
    "--instrument-chrome": "#f0f1f3",
    "--state-live": "#3f9a5f",
  },
  dark: {
    "--instrument-reading-surface": "#212327",
    "--instrument-reading-border": "#3a3d43",
    "--instrument-chrome": "#1a1c20",
    "--state-live": "#66b587",
  },
} as const;

test.describe("instrument state tokens (design spec §02)", () => {
  for (const [scheme, tokens] of Object.entries(ADDRESSING)) {
    test(`${scheme} resolves every addressing token`, async ({ browser }) => {
      const context = await browser.newContext({
        colorScheme: scheme as "light" | "dark",
      });
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

  test("the chrome bar recedes from the reading surface in both themes", async () => {
    // The single easiest mistake in the dark pass, and it is invisible unless
    // you hold both themes side by side.
    //
    // In LIGHT, a reading instrument keeps the page surface (#fafafb) and its
    // chrome bar recedes by going DARKER (#f0f1f3). Elevation reads the other
    // way round in dark: a reading instrument LIFTS off the page to #212327,
    // and the obvious port of the light rule — "chrome is a shade off the
    // surface" — makes the bar lighter still, so the frame reads inside out
    // with its chrome floating above the thing it belongs to. The bar has to
    // step DOWN to #1a1c20 instead.
    //
    // Stated as luminance so it cannot be satisfied by a plausible-looking hex:
    // in BOTH themes the chrome is darker than the surface, which is the same
    // sentence and the opposite elevation move.
    const luminance = (hex: string) => {
      const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const lin = (c: number) =>
        c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      const [r, g, b] = channels as [number, number, number];
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };

    for (const [scheme, tokens] of Object.entries(ADDRESSING)) {
      expect(
        luminance(tokens["--instrument-chrome"]),
        `${scheme}: chrome must recede from the reading surface, not float above it`,
      ).toBeLessThan(luminance(tokens["--instrument-reading-surface"]));
    }
  });
});
