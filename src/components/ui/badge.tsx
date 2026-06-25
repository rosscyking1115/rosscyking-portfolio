import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded border text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-secondary text-secondary-foreground px-2.5 py-0.5",
        outline: "border-border bg-background text-foreground px-2.5 py-1",
        muted: "border-transparent bg-muted text-muted-foreground px-2.5 py-0.5",
        // Mono "instrument readout" chip — used for project stack tags.
        tag: "border-border text-muted-foreground font-mono text-[11px] px-2 py-0.5",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
