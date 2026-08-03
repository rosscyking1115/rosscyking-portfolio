import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Conditionally join Tailwind class names while merging conflicting utilities.
 *
 * ── WHY THIS IS EXTENDED, AND HOW IT WAS FOUND ───────────────────────────────
 * tailwind-merge resolves conflicts from a built-in map of Tailwind's DEFAULT
 * scales. It has never seen this project's `@theme` — so when the design spec's
 * type scale landed as `--text-label`, `--text-body` and the rest, twMerge read
 * `text-label` as a TEXT COLOUR, decided it conflicted with `text-primary-
 * foreground` further down the same class string, and silently dropped it.
 *
 * The button rendered with no font-size at all and inherited 16px where the
 * spec asks for 12px. Nothing failed: the class was gone from the HTML before
 * Tailwind ever saw it, so no rule was missing from the stylesheet either.
 *
 * Caught by grepping the BUILT markup for the class rather than the source.
 * That is the only place the difference is visible — a merge that removes a
 * class leaves the source, the config and the CSS all correct.
 *
 * So every custom scale has to be declared here as well as in @theme. The two
 * lists must stay in step; tests/unit/design-tokens.test.ts asserts they do.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // The spec's type scale. Without this they read as text colours.
      "font-size": [
        {
          text: [
            "band",
            "major",
            "minor",
            "step",
            "bio",
            "body",
            "body-sm",
            "body-xs",
            "secondary",
            "secondary-sm",
            "secondary-xs",
            "label",
            "label-sm",
            "mono-min",
          ],
        },
      ],
      // Radius by role, so `rounded-pill` is not read as `rounded-{side}`.
      rounded: [{ rounded: ["control", "panel", "card", "pill"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
