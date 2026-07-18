"use client";

import type { LensKey } from "@/lib/lenses";
import { cn } from "@/lib/utils";

interface LensNavItem {
  key: LensKey;
  label: string;
}

/**
 * Role-lens selector. Clicking a lens re-ranks the featured section in place
 * (no navigation); these are toggle buttons, not links, so `aria-pressed`
 * marks the active one.
 */
export function LensSwitcher({
  items,
  current,
  onSelect,
}: {
  items: LensNavItem[];
  current: LensKey;
  onSelect: (key: LensKey) => void;
}) {
  return (
    <div
      role="group"
      aria-label="View this portfolio by role"
      className="flex flex-wrap items-center gap-x-3 gap-y-2"
    >
      <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
        Viewing as&nbsp;→
      </span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const active = item.key === current;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(item.key)}
              className={cn(
                "focus-visible:ring-ring cursor-pointer rounded-full border px-3 py-1 font-mono text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none",
                active
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
