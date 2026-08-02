import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { cn } from "../../src/lib/utils";

/**
 * The custom scales in `@theme` and the ones declared to tailwind-merge must
 * stay in step.
 *
 * ── THE BUG THIS EXISTS FOR ──────────────────────────────────────────────────
 * tailwind-merge resolves conflicts from a map of Tailwind's DEFAULT scales. It
 * has never seen this project's theme — so `text-label`, a font size, was read
 * as a TEXT COLOUR, judged to conflict with `text-primary-foreground` in the
 * same class string, and dropped.
 *
 * The button rendered with no font-size at all and inherited 16px where the
 * spec asks for 12px. Nothing failed anywhere: the class was gone from the HTML
 * before Tailwind ever scanned it, so the stylesheet was not missing a rule
 * either. It was found by grepping the BUILT markup for a class that was in the
 * source — which is the only place the difference shows.
 *
 * A scale added to global.css and not to src/lib/utils.ts fails here.
 */
const CSS = readFileSync(join(process.cwd(), "src/styles/global.css"), "utf8");

/** Every `--text-*` / `--radius-*` custom scale declared in @theme inline. */
function declaredIn(prefix: string): string[] {
  const theme = CSS.slice(CSS.indexOf("@theme inline"));
  return (
    [...theme.matchAll(new RegExp(`--${prefix}-([a-z-]+):`, "g"))]
      .map((match) => match[1]!)
      // Tailwind's own defaults, which tailwind-merge already knows.
      .filter((name) => !["sm", "md", "lg", "xl"].includes(name))
  );
}

describe("design tokens — tailwind-merge knows every custom scale", () => {
  it("keeps a custom font size against a text colour", () => {
    // The exact collision that dropped the button's size.
    expect(cn("text-label", "text-primary-foreground")).toContain("text-label");
    expect(cn("text-body", "text-muted-foreground")).toContain("text-body");
  });

  it("keeps a custom radius against another radius utility", () => {
    expect(cn("rounded-pill", "rounded-none")).not.toContain("rounded-pill");
    expect(cn("rounded-none", "rounded-pill")).toContain("rounded-pill");
  });

  it("still merges genuine conflicts, so the extension has not disabled it", () => {
    // A guard against "fixing" this by turning the merge off.
    expect(cn("text-label", "text-body")).toBe("text-body");
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("every custom scale in @theme is declared to tailwind-merge", () => {
    const utils = readFileSync(join(process.cwd(), "src/lib/utils.ts"), "utf8");
    for (const name of declaredIn("text")) {
      expect(
        utils,
        `--text-${name} is in @theme but not in cn()'s class groups`,
      ).toContain(`"${name}"`);
    }
    for (const name of declaredIn("radius")) {
      expect(
        utils,
        `--radius-${name} is in @theme but not in cn()'s class groups`,
      ).toContain(`"${name}"`);
    }
  });
});
