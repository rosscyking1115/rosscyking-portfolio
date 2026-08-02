import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The motion contract, enforced against the SOURCE.
 *
 * tests/e2e/motion.spec.ts already asserts every ban on the rendered page, and
 * that is the stronger check — it sees computed styles, dependencies and base
 * rules, none of which a text scan can. This exists for the one thing it cannot
 * see: a banned utility sitting in a component no route renders yet.
 *
 * That is not hypothetical here. NowBuilding.astro renders nothing at all —
 * its data array is empty — and it carried a `.reveal-on-scroll` and an
 * `animate-ping` that no browser has ever painted. AGENTS.md records the same
 * shape of defect three times over: "an empty array, a falsy guard and a
 * deleted file all produce identical output". A rendered-page gate is blind to
 * exactly that, so this is the half that is not blind to it.
 *
 * Both halves have to be here. Neither one alone is the gate.
 */

/**
 * `process.cwd()`, not `import.meta.url`. Vitest runs these through Astro's own
 * Vite pipeline (see vitest.config.ts), which serves test files from a virtual
 * `/@fs/` prefix — so the URL form resolves to `C:\@fs\C:\dev\...` and the scan
 * finds nothing. A gate that silently scans zero files passes forever.
 */
const ROOT = process.cwd();
const SOURCE_DIR = join(ROOT, "src");
const EXTENSIONS = [".astro", ".tsx", ".ts", ".css"];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return EXTENSIONS.some((ext) => entry.endsWith(ext)) ? [full] : [];
  });
}

/**
 * Blank out comments, preserving every newline so reported line numbers still
 * point at the real line.
 *
 * A gate that reads comments is a gate that forbids writing about itself. This
 * repo has hit that twice already: `validate:projects` flagged Ross's own
 * retraction prose because it quotes the claim being withdrawn, and the same
 * shape would apply here — the MOTION CONTRACT in global.css names every banned
 * token by necessity, and so does the file you are reading. A comment cannot
 * ship motion, so a comment cannot violate the contract.
 */
function stripComments(text: string): string {
  const blank = (match: string) => match.replace(/[^\r\n]/g, " ");
  return text
    .replace(/\/\*[\s\S]*?\*\//g, blank) // /* … */ and Astro's {/* … */}
    .replace(
      /(^|[^:])\/\/[^\r\n]*/g,
      (m, lead: string) => lead + blank(m.slice(lead.length)),
    );
}

/**
 * Every source file, as { path, text }, read once and shared by the cases.
 * `text` is comment-stripped; `raw` is not, for the few checks that want it.
 */
const FILES = sourceFiles(SOURCE_DIR).map((path) => {
  const raw = readFileSync(path, "utf8");
  return {
    path: relative(ROOT, path).replace(/\\/g, "/"),
    raw,
    text: stripComments(raw),
  };
});

/** The scan is worthless if it reads nothing. Assert it found the source tree. */
if (FILES.length < 20) {
  throw new Error(
    `motion contract scanned only ${FILES.length} files under ${SOURCE_DIR}`,
  );
}

/**
 * Findings are reported as `path:line — the offending text`, so a failure
 * points at the edit rather than at the rule.
 */
function scan(
  pattern: RegExp,
  skip: (file: string, line: string) => boolean = () => false,
) {
  const found: string[] = [];
  for (const file of FILES) {
    file.text.split(/\r?\n/).forEach((line, i) => {
      if (skip(file.path, line)) return;
      const match = line.match(pattern);
      if (match) found.push(`${file.path}:${i + 1} — ${match[0].trim()}`);
    });
  }
  return found;
}

/**
 * The ONE displacement the amended contract allows, quoted exactly.
 *
 * Written as a literal rather than a pattern on purpose: a regex that matched
 * "translateY of some length" would wave through a 200px slide, and the
 * distance is the difference between an arrival and a reveal.
 */
const ARRIVAL_SHIFT = "transform: translateY(var(--enter-shift, 14px))";

/** The one arrival keyframe. Everything else is checked against this name. */
const ARRIVAL_KEYFRAME = "enter-rise";

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The stylesheet with every `@keyframes` block removed.
 *
 * A keyframe's start frame legitimately says `opacity: 0` — that is what an
 * arrival IS — so a scan for unguarded hiding has to read the RULES that apply
 * animations, not the animations themselves. Brace-walked rather than
 * regex-matched, because a keyframe body is nested one level deep and
 * `/@keyframes[^}]*}/` stops at the first percentage block.
 */
function withoutKeyframes(css: string): string {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const start = css.indexOf("@keyframes", i);
    if (start === -1) return out + css.slice(i);
    out += css.slice(i, start);
    let depth = 0;
    let j = css.indexOf("{", start);
    for (; j < css.length; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}" && --depth === 0) break;
    }
    i = j + 1;
  }
  return out;
}

describe("motion contract — nothing translates", () => {
  it("no class string moves an element", () => {
    // Would have caught, in one go: `hover:-translate-y-0.5` on every card on
    // two routes, `group-hover:translate-x-0.5` on three arrows, and
    // `group-hover:scale-[1.02]` on the evidence-frame screenshot. All six
    // shipped, none was ever questioned, and each one reads as a nicety.
    expect(scan(/(?:^|[\s"'`:])-?(?:translate|scale|rotate|skew)-[\w[\]./-]+/)).toEqual(
      [],
    );
  });

  it("no CSS declaration displaces anything, outside the one arrival", () => {
    // NARROWED TWICE, and each narrowing is recorded because the width of this
    // rule is the whole gate.
    //
    // It used to reject the string `@keyframes` outright, which was a fair
    // proxy while the site's only keyframe was the entrance reveal — and became
    // wrong the moment §02's reading line needed a keyframe that changes two
    // colours and nothing else. What a keyframe CONTAINS is checked properly,
    // one case down.
    //
    // The second narrowing is the amended contract: `[data-enter]` rises 14px.
    // Rather than exempt a file or a block — which would let anything at all
    // move as long as it moved in global.css — the exemption is the exact
    // declaration, and the next case pins how many times it may appear. A
    // second displacement, at any distance, in any file, still fails here.
    //
    // The lookbehind is doing real work: without it, `text-transform:
    // uppercase` matches, and the first run of this reported the email
    // template's eyebrow and the write-up's table headers as motion.
    //
    // AND THE `none` EXEMPTION WAS BROKEN THE WHOLE TIME. It read
    // `transform:\s*(?!none)`, where `\s*` backtracks to zero characters and
    // the lookahead then tests " none", which does not begin with "none" — so
    // it matched. It was never noticed because no rule on the site had written
    // `transform: none` until the arrival's end frame did. A gate that has
    // never been exercised in the direction that matters is a gate whose
    // behaviour is a guess. `\s*` now lives inside the lookahead.
    expect(
      scan(
        /(?<![\w-])(?:transform:(?!\s*none\b)|translate:\s|scale:\s|rotate:\s)/,
        (_file, line) => line.includes(ARRIVAL_SHIFT),
      ),
    ).toEqual([]);
  });

  it("the arrival displaces exactly one distance, in exactly one file", () => {
    // The exemption above is worth nothing if it can be pasted. Two sites, both
    // in global.css: the keyframe's start, and the held state of a scroll-
    // triggered element whose observer has not fired yet. A third means someone
    // wrote a second entrance, which is how this codebase came to have four.
    const found = FILES.flatMap((file) =>
      (file.text.match(new RegExp(escape(ARRIVAL_SHIFT), "g")) ?? []).map(
        () => file.path,
      ),
    );
    expect(found).toEqual(["src/styles/global.css", "src/styles/global.css"]);
  });
});

describe("motion contract — one arrival, never continuous, never replayed", () => {
  it("the old entrance reveal is gone, and stays gone", () => {
    // The 2 Aug 2026 amendment brought arrivals back; it did not bring THAT
    // one back. `.reveal` / `.reveal-on-scroll` was a `view()` timeline, which
    // is SCRUBBED — it plays backwards on the way up and replays on every lens
    // switch, and "arrives once" is not expressible in it. The replacement is
    // an IntersectionObserver setting an attribute exactly once.
    //
    // So this case survives the amendment unchanged, and its reason is now the
    // "nothing replays" ban rather than the "nothing arrives" one.
    expect(
      scan(/\breveal(?:-on-scroll)?\b|--reveal-(?:delay|shift|distance|duration)/),
    ).toEqual([]);
  });

  it("exactly one keyframe animates opacity or transform, and it is the arrival", () => {
    // NARROWED TWICE, and both narrowings are the point.
    //
    // It used to ban `animation-timeline`, `view()` and `scroll()` outright.
    // That was right for what existed at the time — the only scroll-driven
    // thing on the site was the entrance reveal — and WRONG as a rule, because
    // §02's third addressing input is proximity to a reading line, which is a
    // scroll-driven state and the only addressing a phone can have. Banning the
    // mechanism banned the design.
    //
    // Then it banned opacity and transform in ANY keyframe, which the amended
    // contract's arrival breaks by definition. So the rule becomes a count: one
    // keyframe may do it, it must be the named one, and the next case checks it
    // is not wired to a scroll timeline — because a scrubbed arrival is a
    // reveal again no matter what it is called.
    //
    // tests/e2e/motion.spec.ts enforces the same rule against LIVE keyframes
    // read off getAnimations(), which is the half a text scan cannot do.
    const keyframeBlocks = FILES.flatMap((file) =>
      [...file.text.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)].map((match) => {
        // Walk braces from the opening one, so nested percentage blocks are
        // included and the next rule is not.
        let depth = 0;
        let end = match.index! + match[0].length - 1;
        for (let i = end; i < file.text.length; i++) {
          if (file.text[i] === "{") depth++;
          else if (file.text[i] === "}" && --depth === 0) {
            end = i;
            break;
          }
        }
        return {
          file: file.path,
          name: match[1]!,
          body: file.text.slice(match.index!, end + 1),
        };
      }),
    );

    const offenders = keyframeBlocks
      .filter((block) =>
        /(?:^|[\s;{])(?:opacity|transform|translate|scale|rotate)\s*:/m.test(block.body),
      )
      .map((block) => `${block.file} — @keyframes ${block.name}`);
    expect(offenders).toEqual([`src/styles/global.css — @keyframes ${ARRIVAL_KEYFRAME}`]);
  });

  it("the arrival is not on a scroll timeline — it must not be scrubbable", () => {
    // A `view()` timeline runs BACKWARDS as you scroll up and restarts every
    // time an element re-enters, so an arrival driven by one arrives as many
    // times as the reader scrolls past it. That is the exact defect the old
    // reveal had and the reason it needed a workaround for the lens switcher.
    //
    // Stated structurally rather than by inspection: whichever rule applies the
    // arrival keyframe must not also name a timeline. The two timelines the
    // site does use — the reading line and the progress hairline — are checked
    // for what they animate by the case above, and neither may touch opacity or
    // transform.
    const css = FILES.find((file) => file.path.endsWith("src/styles/global.css"))!.text;
    const rules = css
      .split("}")
      .filter((rule) => new RegExp(`animation:[^;]*${ARRIVAL_KEYFRAME}`).test(rule));
    expect(rules.length, `no rule applies @keyframes ${ARRIVAL_KEYFRAME}`).toBe(1);
    expect(rules[0]).not.toMatch(/animation-timeline/);
  });

  it("every arrival is gated on data-motion, so the default page hides nothing", () => {
    // The safety argument for the whole amendment, asserted rather than
    // described. `opacity: 0` is what an arrival uses to hide something; if any
    // of those declarations escapes the `html[data-motion]` scope, then a
    // reader with no JavaScript — or one the inline script threw for — is
    // looking at a blank column with no way to recover.
    //
    // Scoped to global.css because that is the only file allowed to declare the
    // arrival at all, which the two cases above already pin.
    const css = withoutKeyframes(
      FILES.find((file) => file.path.endsWith("src/styles/global.css"))!.text,
    );
    const unguarded = css
      .split("}")
      .filter((rule) => /(?:^|[\s;{])opacity:\s*0\s*;/.test(rule))
      .filter((rule) => !rule.includes("[data-motion]"))
      .map((rule) => rule.trim().split(/\r?\n/)[0]);
    expect(unguarded).toEqual([]);
  });

  it("nothing animates continuously", () => {
    // Would have caught the three `animate-ping` availability dots — one of
    // which had no reduced-motion escape at all, while the other two did.
    expect(scan(/\banimate-(?!none\b)[\w[\]./-]+/)).toEqual([]);
  });
});

describe("motion contract — no opacity on text", () => {
  /**
   * The disabled state is the sole exception, and it is enumerated site by
   * site rather than matched by a pattern.
   *
   * WCAG 1.4.3 exempts "text that is part of an inactive user interface
   * component" from the contrast requirement, which is the whole reason the
   * ban exists — every OTHER state has to be gradeable. A `disabled:` prefix
   * is not itself a licence, so the allowlist names the three places rather
   * than waving through the next one to arrive with the right prefix.
   */
  const ALLOWLIST = [
    "src/lib/button-variants.ts — disabled:opacity-50",
    "src/components/ui/form-controls.tsx — disabled:opacity-50",
    "src/components/ui/form-controls.tsx — peer-disabled:opacity-70",
  ];

  it("has no opacity on text outside the disabled state", () => {
    expect(
      scan(
        /(?:^|[\s"'`:])(?:hover:|focus:|group-hover:|focus-visible:)?opacity-\d+/,
        (_file, line) => /(?:peer-)?disabled:opacity-\d+/.test(line),
      ),
    ).toEqual([]);
  });

  it("allowlists exactly the three disabled-state sites", () => {
    const found = FILES.flatMap((file) =>
      (file.text.match(/(?:peer-)?disabled:opacity-\d+/g) ?? []).map(
        (token) => `${file.path} — ${token}`,
      ),
    );
    expect(found.sort()).toEqual([...ALLOWLIST].sort());
  });
});

describe("motion contract — the vocabulary is three durations and one easing", () => {
  it("no transition picks its own duration", () => {
    // Tailwind's bare `duration-150` was on buttons, cards and the write-up's
    // prev/next nav — three different components agreeing on a number that is
    // not one of the three tokens, which is how a vocabulary stops being one.
    expect(scan(/\bduration-(?!\[var\(--motion-)[\w[\]./-]+/)).toEqual([]);
  });

  it("no transition picks its own easing", () => {
    // This targets the Tailwind UTILITY — `ease-out`, `ease-linear`, an
    // arbitrary `ease-[…]`. The lookbehind keeps it off the token that defines
    // the second easing: `--motion-ease-entrance` contains the string
    // `ease-entrance`, so without it the amendment reported its own definition
    // and its own single use as violations. The token is checked by name and
    // value one case down, and its curve is checked numerically below that.
    expect(scan(/(?<!-motion-)\bease-(?!instrument\b)[\w[\]./-]+/)).toEqual([]);
  });

  it("no transition leaves the duration and easing to Tailwind's defaults", () => {
    // The gap the two previous cases leave open, and it is not theoretical:
    // `transition-colors` on its own is silently 150ms on Tailwind's own
    // easing, so it breaks the vocabulary while matching neither a `duration-`
    // nor an `ease-` pattern. It was on every badge on every page, and the
    // RENDERED gate is what found it — this closes the source half so the next
    // one fails at the edit rather than at the browser.
    //
    // Checked per double-quoted class string rather than per line, because
    // Tailwind class strings are long and a single line often holds more than
    // one. That is a real limitation — a class list in a template literal or
    // single quotes is invisible here. The rendered gate has no such blind
    // spot, which is the division of labour between the two halves.
    const found: string[] = [];
    for (const file of FILES) {
      file.text.split(/\r?\n/).forEach((line, i) => {
        for (const match of line.matchAll(/"([^"]*\btransition-[^"]*)"/g)) {
          const classes = match[1]!;
          if (/\btransition-none\b/.test(classes)) continue;
          const timed = classes.includes("duration-[var(--motion-");
          const eased = classes.includes("ease-instrument");
          if (!timed || !eased) {
            found.push(
              `${file.path}:${i + 1} — transition without ${
                timed ? "ease-instrument" : "a motion duration"
              }`,
            );
          }
        }
      });
    }
    expect(found).toEqual([]);
  });

  it("defines every duration and easing exactly once", () => {
    const css = FILES.find((file) => file.path.endsWith("src/styles/global.css"));
    expect(css, "src/styles/global.css not found").toBeDefined();
    for (const token of [
      "--motion-state: 120ms",
      "--motion-address: 160ms",
      "--motion-disclose: 220ms",
      "--motion-ease: cubic-bezier(0.2, 0, 0, 1)",
      // The 2 Aug 2026 amendment. Same rule, four more names: a component that
      // wants a different arrival speed changes the token or does without.
      "--motion-entrance: 520ms",
      "--motion-stagger: 110ms",
      "--motion-count: 900ms",
      "--motion-ease-entrance: cubic-bezier(0.16, 1, 0.3, 1)",
    ]) {
      expect(css!.text.split(token)).toHaveLength(2);
    }
  });

  it("nothing bounces or overshoots — checked numerically, not by name", () => {
    // REPLACES A RULE THAT WAS ENFORCED BY HAVING ONE EASING. "Nothing bounces"
    // used to be free: there was a single cubic-bezier on the site, so nobody
    // could add an overshoot without adding an easing, which a different case
    // already refused. The amendment adds a second easing and takes that away.
    //
    // An overshoot is not a name — `ease-out-back` is a convention, not a
    // syntax — it is a control point outside [0,1] on the OUTPUT axis. A curve
    // whose y leaves that range travels past its destination and comes back,
    // which is the definition of a bounce however it is spelled. The x values
    // are unconstrained by CSS itself and are left alone here.
    const offenders: string[] = [];
    for (const file of FILES) {
      for (const match of file.text.matchAll(
        /cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/g,
      )) {
        const [y1, y2] = [Number(match[2]), Number(match[4])];
        if (y1 < 0 || y1 > 1 || y2 < 0 || y2 > 1) {
          offenders.push(`${file.path} — ${match[0]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("motion contract — the arrival is enumerated (amended 2 Aug 2026)", () => {
  /**
   * `data-enter` is the whole opt-in. Anything carrying it is hidden until it
   * is told otherwise, so a typo in the value is not a cosmetic fault — it is
   * an element that never arrives, on a page where nothing looks broken because
   * the space it would occupy is space it was always going to occupy.
   *
   * There are two triggers and there is no third. If a surface needs one, it
   * needs a decision, not an attribute value.
   */
  it("every data-enter names one of the two triggers", () => {
    const values = FILES.flatMap((file) =>
      [...file.text.matchAll(/data-enter=(?:"|\{")([^"]*)"/g)].map(
        (match) => `${file.path} — ${match[1]}`,
      ),
    ).filter((entry) => !/ — (load|scroll)$/.test(entry));
    expect(values).toEqual([]);
  });

  it("only the home page carries an arrival", () => {
    // The amendment is scoped to the home page and the scoping is the reason
    // the a11y gate only loses "graded as loaded" on one route. A `data-enter`
    // appearing on /projects or /about would extend that cost silently — and
    // the arrival script that drives the scroll trigger is not even loaded
    // there, so a `data-enter="scroll"` outside home would hide content
    // permanently rather than animate it.
    const carriers = [
      ...new Set(
        FILES.filter((file) => file.text.includes("data-enter")).map((f) => f.path),
      ),
    ].sort();
    expect(carriers).toEqual(
      [
        "src/components/home/ArrivalScript.astro",
        "src/components/home/Hero.astro",
        "src/components/home/FeaturedProjects.astro",
        "src/styles/global.css",
      ].sort(),
    );
  });
});

describe("instrument state tokens (design spec §02)", () => {
  it("every addressing token has both a light and a dark value", () => {
    // The e2e gate pins the VALUES; this pins the pairing. A token defined in
    // `:root` and forgotten under `.dark` resolves to the light value in dark
    // mode — which is legible, plausible, and wrong, so nothing would fail.
    const css = FILES.find((file) => file.path.endsWith("src/styles/global.css"))!.text;
    const [, dark = ""] = css.split(/^\.dark \{$/m);
    for (const token of [
      "--instrument-reading-surface",
      "--instrument-reading-border",
      "--instrument-chrome",
      "--state-live",
    ]) {
      expect(css, `${token} is not defined at all`).toContain(`${token}:`);
      expect(dark, `${token} has no dark value`).toContain(`${token}:`);
    }
  });
});
