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

  it("no keyframe displaces anything", () => {
    expect(scan(/@keyframes|transform:\s*translate|transform:\s*scale/)).toEqual([]);
  });
});

describe("motion contract — never on arrival, on scroll, or continuously", () => {
  it("the entrance reveal is gone, and stays gone", () => {
    // Would have caught the reveal returning under any of its names. It was
    // removed for LCP: an element at opacity 0 is not painted, so a faded hero
    // gated Largest Contentful Paint on the animation rather than on the byte.
    expect(
      scan(/\breveal(?:-on-scroll)?\b|--reveal-(?:delay|shift|distance|duration)/),
    ).toEqual([]);
  });

  it("no scroll-driven animation is declared", () => {
    expect(scan(/animation-timeline|animation-range|\bview\(\)|\bscroll\(\)/)).toEqual(
      [],
    );
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
    expect(scan(/\bease-(?!instrument\b)[\w[\]./-]+/)).toEqual([]);
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

  it("defines the three durations and the easing exactly once", () => {
    const css = FILES.find((file) => file.path.endsWith("src/styles/global.css"));
    expect(css, "src/styles/global.css not found").toBeDefined();
    for (const token of [
      "--motion-state: 120ms",
      "--motion-address: 160ms",
      "--motion-disclose: 220ms",
      "--motion-ease: cubic-bezier(0.2, 0, 0, 1)",
    ]) {
      expect(css!.text.split(token)).toHaveLength(2);
    }
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
