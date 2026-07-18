import Link from "next/link";

import type { LensKey } from "@/lib/lenses";
import { cn } from "@/lib/utils";

interface LensNavItem {
  key: LensKey;
  label: string;
  href: string;
}

/**
 * Role-lens selector. Each home route (`/` and `/for/<lens>`) renders with a
 * known active lens, so this is a plain prop-driven server component — links,
 * no client JS. The active lens re-ranks the featured set on the page it links
 * to; the current one is a non-navigating marker.
 */
export function LensSwitcher({
  items,
  current,
}: {
  items: LensNavItem[];
  current: LensKey;
}) {
  return (
    <nav
      aria-label="View this portfolio by role"
      className="flex flex-wrap items-center gap-x-3 gap-y-2"
    >
      <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
        Viewing as&nbsp;→
      </span>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const active = item.key === current;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-visible:ring-ring inline-flex rounded-full border px-3 py-1 font-mono text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  active
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
