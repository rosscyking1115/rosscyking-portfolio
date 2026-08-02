import { cn } from "./utils";

/**
 * Badge styling, ported from the `cva` config in src/components/ui/badge.tsx.
 * Same reasoning as button-variants.ts: a plain function instead of pulling in
 * class-variance-authority, which existed only to type React variant props.
 *
 * The class strings were byte-identical to the Next version. One has since
 * changed: `transition-colors` is gone. A badge is a static readout with no
 * hover, focus or pressed state, so it declared a 150ms transition on eleven
 * properties that nothing has ever triggered — dead weight carried across from
 * the cva default. It is not retimed to a motion token, because a control that
 * cannot change state does not need one. Found by tests/e2e/motion.spec.ts, on
 * every badge on every page, in the same run that proved the gate works.
 */
export type BadgeVariant = "default" | "outline" | "muted" | "tag";

const BASE = "inline-flex items-center rounded border text-xs font-medium";

const VARIANTS: Record<BadgeVariant, string> = {
  default: "border-transparent bg-secondary text-secondary-foreground px-2.5 py-0.5",
  outline: "border-border bg-background text-foreground px-2.5 py-1",
  muted: "border-transparent bg-muted text-muted-foreground px-2.5 py-0.5",
  // Mono "instrument readout" chip — used for project stack tags.
  tag: "border-border text-muted-foreground font-mono text-[11px] px-2 py-0.5",
};

export function badgeVariants({
  variant = "default",
  class: className,
}: { variant?: BadgeVariant; class?: string } = {}): string {
  return cn(BASE, VARIANTS[variant], className);
}
