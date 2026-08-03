import { expect, test, type Page } from "@playwright/test";

import { ROUTES as ALL_ROUTES } from "./routes";

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
 * So these assert the bans directly, on the page ONCE IT HAS SETTLED:
 *
 *   NOTHING TRANSLATES   no transform at rest, and no transition may name a
 *                        transform property
 *   NO OPACITY ON TEXT   every element carrying text is fully opaque
 *   NOTHING CONTINUES    no animation is still running when the page is done
 *   NOTHING SCRUBS       no scroll-driven animation touches opacity or transform
 *   VOCABULARY           every transition on the page uses one of the durations
 *                        and one of the two easings
 *
 * ── "AS LOADED" BECAME "ONCE IT HAS SETTLED", AND THAT IS A REAL WEAKENING ───
 * Until 2 Aug 2026 nothing on this site moved, so the page as loaded and the
 * page at rest were the same page and this file could read it at any moment.
 * The amended contract (Ross's call — see the MOTION CONTRACT block in
 * src/styles/global.css) gives the home page an arrival, so there is now a
 * window in which the masthead is legitimately at zero opacity and displaced by
 * 14px. Sampling inside it would fail against correct code.
 *
 * The honest response is to say what changed rather than to widen the rules:
 *
 *   - The sweep waits for every document-timeline animation to REACH
 *     `finished`, then asserts. So "nothing animates" becomes "nothing is still
 *     animating", which still catches an infinite animation — it never
 *     finishes, so the wait times out and names it.
 *   - The transient state is not unchecked, it is checked SOMEWHERE ELSE:
 *     tests/e2e/arrival.spec.ts asserts what it looks like mid-flight, that it
 *     happens once, and that it cannot happen at all without JavaScript.
 *   - Elements that have not arrived yet are skipped here BY NAME, and the set
 *     of elements allowed to carry `data-enter` is pinned in the unit half. A
 *     component that opts itself into the exemption fails there.
 *
 * tests/unit/motion-contract.test.ts is the source-level half of this gate.
 * Both halves exist on purpose: the source scan catches a banned utility in a
 * file no route renders yet, and this catches anything that arrives from a
 * dependency, a base style or a computed default.
 */

/**
 * Every route a visitor can reach, DERIVED — see tests/e2e/routes.ts. This file
 * shipped with its own hardcoded list too, which is how /privacy and /colophon
 * were swept for banned motion on exactly zero pages.
 */
const ROUTES = ALL_ROUTES;

/** Every motion token and both easings, as getComputedStyle reports them. */
const VOCABULARY = {
  durations: ["0.12s", "0.16s", "0.22s", "0.52s"],
  easings: ["cubic-bezier(0.2, 0, 0, 1)", "cubic-bezier(0.16, 1, 0.3, 1)"],
};

/**
 * Wait until nothing is moving.
 *
 * A scroll- or view-driven animation never "finishes" — its progress is the
 * reader's scroll position, so it sits at `running` forever by design. Those
 * are excluded here and checked for WHAT they animate further down; only
 * document-timeline animations have to reach `finished`.
 *
 * An infinite animation is therefore caught by this timing out rather than by
 * an assertion, which is a worse failure message and a correct verdict. The
 * source half names it precisely, so the pair still says which rule broke.
 */
async function settle(page: Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.timeline?.constructor.name !== "DocumentTimeline" ||
          animation.playState === "finished",
      ),
  );
}

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

    /**
     * `transform: none` DOES NOT COMPUTE TO "none" ONCE AN ANIMATION HAS
     * TOUCHED IT, and this cost the first run of the amended suite four
     * failures against entirely correct code.
     *
     * A finished animation with `fill: both` keeps applying its end frame, so
     * an element whose arrival ended at `transform: none` reports
     * `matrix(1, 0, 0, 1, 0, 0)` — the identity. The old string comparison
     * called that a displacement.
     *
     * The rule was always about displacement rather than about the literal
     * string, so it is stated as displacement: parse the matrix and compare it
     * to the identity. This is marginally MORE permissive (a `scale(1)` now
     * passes, as it should — it moves nothing) and considerably more honest.
     */
    const displaced = (value: string) => {
      if (value === "none") return false;
      const numbers = value.match(/-?[\d.]+(?:e-?\d+)?/g)?.map(Number) ?? [];
      const identity =
        numbers.length === 6
          ? [1, 0, 0, 1, 0, 0]
          : numbers.length === 16
            ? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
            : null;
      if (!identity) return true;
      return numbers.some((n, i) => Math.abs(n - identity[i]!) > 0.0001);
    };

    const animating: string[] = [];
    const scrollDriven: string[] = [];
    const transformed: string[] = [];
    const faded: string[] = [];
    const offVocabulary: string[] = [];

    /**
     * An element the amended contract has NOT finished with yet: it carries an
     * arrival, its trigger is the reader scrolling to it, and they have not.
     * It is legitimately at zero opacity and 14px low, and it will stay there
     * until the observer marks it.
     *
     * Skipped rather than asserted, and the exemption is narrow on purpose: an
     * element that HAS arrived is held to every rule below, so an arrival that
     * fails to clear its own transform is caught here rather than exempted.
     */
    const pending = (el: Element) =>
      el.matches('[data-enter="scroll"]:not([data-shown])') ||
      Boolean(el.closest('[data-enter="scroll"]:not([data-shown])'));

    for (const el of document.querySelectorAll("*")) {
      const style = getComputedStyle(el);

      // "Nothing is STILL animating." An infinite animation is always running;
      // a one-shot arrival has reached `finished` before the sweep starts, and
      // `settle()` is what guarantees that. A scroll or view timeline is driven
      // by the reader and is how §02's reading line works, so it is allowed and
      // checked separately, below, for what it animates.
      if (
        style.animationName !== "none" &&
        style.animationTimeline === "auto" &&
        el.getAnimations().some((animation) => animation.playState === "running")
      ) {
        animating.push(`${describe(el)} → ${style.animationName}`);
      }
      if (displaced(style.transform) && !pending(el)) {
        transformed.push(`${describe(el)} → ${style.transform}`);
      }

      // Opacity only matters where there is text to make illegible. An
      // aria-hidden dot or a decorative rule can be any opacity it likes.
      const hasText = [...el.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      );
      if (
        hasText &&
        Number(style.opacity) < 1 &&
        !el.closest("[disabled]") &&
        !pending(el)
      ) {
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
        if (!vocabulary.easings.includes(ease)) {
          offVocabulary.push(`${describe(el)} → ${prop} eased ${ease}`);
        }
      });
    }

    // Scroll-driven animations, checked for what they animate rather than for
    // existing. This reads the LIVE keyframes off getAnimations(), which is the
    // only way to know what a running animation actually touches — a CSS text
    // scan can be defeated by a keyframe assembled from custom properties, and
    // getComputedStyle reports the current frame rather than the recipe.
    //
    // The rule: a scroll-driven animation may change colour. The moment one
    // touches opacity or transform it is a reveal, which §01 bans outright, and
    // the fact that a reader is driving it does not make it not a reveal.
    for (const animation of document.getAnimations()) {
      const timeline = animation.timeline;
      if (!timeline || timeline.constructor.name === "DocumentTimeline") continue;
      const effect = animation.effect;
      if (!(effect instanceof KeyframeEffect)) continue;

      const properties = new Set<string>();
      for (const frame of effect.getKeyframes()) {
        for (const key of Object.keys(frame)) {
          if (["offset", "computedOffset", "easing", "composite"].includes(key)) continue;
          properties.add(key);
        }
      }
      const banned = [...properties].filter((property) =>
        /^(opacity|transform|translate|scale|rotate)$/.test(property),
      );
      if (banned.length) {
        const target = effect.target ? describe(effect.target) : "(detached)";
        scrollDriven.push(`${target} → scroll-driven ${banned.join(", ")}`);
      }
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
      await settle(page);
      const found = await sweep(page);

      // Would have caught: `.reveal` / `.reveal-on-scroll`, three `animate-ping`
      // dots, a hover lift on every card, an arrow nudge, a padding drift and a
      // screenshot zoom. One assertion per rule, so a failure names which rule
      // broke rather than "motion changed".
      expect(found.animating, "elements animating with nothing addressed").toEqual([]);
      expect(
        found.scrollDriven,
        "a scroll-driven animation is moving or fading something — that is a reveal",
      ).toEqual([]);
      expect(found.transformed, "elements displaced from their layout position").toEqual(
        [],
      );
      expect(found.faded, "text held below full opacity").toEqual([]);
      expect(found.offVocabulary, "transitions outside the three tokens").toEqual([]);
    });
  }

  test("the page ends in the same place with and without prefers-reduced-motion", async ({
    browser,
  }) => {
    // The spec's reduced-motion rule is "all durations 0 … every instrument
    // renders framed and complete, in order". This asserts that equivalence
    // rather than trusting it, because the system BEFORE the one §01 replaced
    // had a reduced-motion block and still shipped a 360ms transparent proof
    // strip to anyone who asked for less motion: the block collapsed
    // `animation-duration` and never touched `animation-delay`.
    //
    // TWO THINGS CHANGED WITH THE AMENDMENT, AND BOTH WEAKEN THIS TEST.
    //
    //   1. It compares opacity and transform, not `animationName`. Under
    //      reduce the arrival is `animation: none`; under no-preference it is
    //      `enter-rise`, finished. Those differ by construction, so requiring
    //      them to match would be requiring the amendment not to exist. What
    //      still has to match — and what the old failure actually was — is
    //      where every element ENDS UP.
    //   2. The no-preference pass has to scroll the page first. A scroll
    //      arrival that has never been scrolled to is correctly still hidden,
    //      so comparing the two at the top of the page would compare a reader
    //      who has read nothing against one who has read everything.
    //
    // The reduce pass deliberately does NOT scroll. Nothing there depends on
    // scrolling, and if something ever did, this is where it surfaces.
    const shape = async (reducedMotion: "reduce" | "no-preference") => {
      const context = await browser.newContext({ reducedMotion });
      const page = await context.newPage();
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      if (reducedMotion === "no-preference") {
        await page.evaluate(async () => {
          const step = window.innerHeight / 2;
          for (let y = 0; y <= document.body.scrollHeight; y += step) {
            window.scrollTo({ top: y, behavior: "instant" });
            await new Promise((resolve) => requestAnimationFrame(resolve));
          }
          window.scrollTo({ top: 0, behavior: "instant" });
        });
      }
      await settle(page);

      const result = await page.evaluate(() =>
        [...document.querySelectorAll("main *")]
          // RENDERED ELEMENTS ONLY, and the exclusion is load-bearing: the two
          // unselected lens panels are `display: none`, so their rack cards
          // have never been observed and are correctly still held at zero
          // opacity — while under reduced motion no rule hides them at all.
          // Comparing those is comparing a card nobody can see against a card
          // nobody can see, and it reported a difference in exactly that.
          //
          // `checkVisibility()` with its defaults keeps opacity-0 elements in,
          // which is the whole point — a VISIBLE card stuck at zero opacity is
          // the failure this test exists to catch.
          .filter((el) => el.checkVisibility())
          .map((el) => {
            const style = getComputedStyle(el);
            // The identity matrix normalises to "none" for the same reason the
            // sweep above parses it: a finished `fill: both` animation whose end
            // frame is `transform: none` reports `matrix(1, 0, 0, 1, 0, 0)`,
            // while the reduced-motion path never animates and reports "none".
            // They describe the same position, and this test is about position.
            const transform =
              style.transform === "matrix(1, 0, 0, 1, 0, 0)" ? "none" : style.transform;
            return `${style.opacity}|${transform}`;
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
