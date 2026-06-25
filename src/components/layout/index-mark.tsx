import { cn } from "@/lib/utils";

interface IndexMarkProps {
  /** The bracketed token — a number ("01") or a short label ("Ross King"). */
  mark: string;
  /** The label shown after the tick rule. Optional. */
  label?: string;
  className?: string;
}

/**
 * Registration mark — the site's one visual signature. A monospace index in
 * brackets, a 1px tick rule, and an optional label: `[ 01 ] —— Featured work`.
 * The mark is always *true* (priority, reading order, location), never
 * decoration, so it reads like the margin of a field notebook for evaluation
 * results. The tick rule is decorative and hidden from assistive tech.
 */
export function IndexMark({ mark, label, className }: IndexMarkProps) {
  return (
    <div
      className={cn(
        "text-muted-foreground flex items-center gap-3 font-mono text-xs tracking-wider uppercase",
        className,
      )}
    >
      <span className="text-primary">[ {mark} ]</span>
      <span className="bg-border h-px w-8" aria-hidden="true" />
      {label && <span>{label}</span>}
    </div>
  );
}
