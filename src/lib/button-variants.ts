import { cn } from "./utils";

/**
 * Button styling, ported from the `cva` config in src/components/ui/button.tsx.
 *
 * Written as a plain function rather than pulling in `class-variance-authority`
 * and `@radix-ui/react-slot`. Both existed only to serve React: cva for typed
 * variants, Slot for `asChild` so a Button could render an <a>. In Astro the
 * button and link cases are separate elements sharing one class string, so a
 * function over a lookup table does the same job with no runtime dependency and
 * no React island for a link.
 *
 * The class strings were byte-identical to the Next version. One has since
 * changed: the primary variant gains a resting `shadow-xs`. global.css
 * documents the elevation ramp as "resting cards use shadow-xs; hover uses
 * shadow-lift", and cards follow it — the primary button was the one surface
 * whose shadow appeared out of nothing on hover instead of deepening.
 *
 * TIMING. A button is a control, so its hover is the `state` token — 120ms on
 * the shared easing. See the MOTION CONTRACT in src/styles/global.css.
 *
 * `disabled:opacity-50` is one of only three places on the whole site where
 * text carries an opacity — the other two are on the input and its label in
 * src/components/ui/form-controls.tsx. All three are the SAME state, and all
 * three are allowlisted by name in tests/unit/motion-contract.test.ts rather
 * than quietly skipped. The ban exists so that every state can be
 * contrast-graded; WCAG 1.4.3 exempts text that is part of an inactive control,
 * so this one state has nothing to grade. A fourth site fails the gate.
 */
export type ButtonVariant = "default" | "outline" | "ghost" | "link";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

/**
 * ── REBUILT TO THE SPEC README, which changes the button site-wide ───────────
 *
 *   Radius 5px, padding 7px 13px, Geist 500 12px.
 *   rest    #3d5a73 bg / #fafafb text
 *   hover   #324b60
 *   focus   2px #3d5a73 outline, 2px offset
 *   active  opacity .72 on the whole button
 *   dark    #8fa9c2 bg / #151619 text
 *
 * What it was: shadcn's ported geometry — 40px tall, 16px padding, 14px text,
 * rounded-md, and a hover that changed the SHADOW rather than the colour. Four
 * of those five are different values, and the fifth was doing the wrong thing:
 * an accent that never darkens under the pointer is why the palette had no
 * --primary-hover until now.
 *
 * ACTIVE USES OPACITY, and it is allowed. The motion contract bans opacity on
 * TEXT; the spec permits it here explicitly — "active — opacity: .72 on the
 * whole button (permitted; it is not text-only opacity)" — because the whole
 * control fades, label and surface together, rather than the label alone
 * becoming unreadable against a surface that did not move.
 *
 * TOUCH TARGET. 12px text with 7px of vertical padding gives a ~28px control,
 * which clears WCAG 2.2 AA's 24x24 minimum (2.5.8) but not the 44px in the
 * spec's own contract. That 44px line is written about ROWS — "the whole row is
 * the target, never just the arrow" — and instrument rows carry `min-h-11` to
 * honour it. The button is built to the value the spec gives the button.
 */
const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium text-label ring-offset-background transition-[color,background-color,border-color,opacity] duration-[var(--motion-state)] ease-instrument focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:opacity-[0.72] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0";

const VARIANTS: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary-hover",
  outline: "border border-input bg-background hover:bg-muted",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  link: "text-primary underline underline-offset-4",
};

/**
 * Padding, not heights. The spec gives `7px 13px` and a font size; a fixed
 * height would override both and reintroduce the 40px control it replaces.
 */
const SIZES: Record<ButtonSize, string> = {
  default: "px-[13px] py-[7px]",
  sm: "px-2.5 py-1",
  lg: "px-5 py-2.5",
  icon: "size-9",
};

export function buttonVariants({
  variant = "default",
  size = "default",
  class: className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  class?: string;
} = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}
