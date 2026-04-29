import type { ComponentPropsWithoutRef } from "react";

import { Container } from "@/components/layout/container";
import { cn } from "@/lib/utils";

interface SectionProps extends ComponentPropsWithoutRef<"section"> {
  size?: "sm" | "md" | "lg";
  containerSize?: "sm" | "md" | "lg";
  eyebrow?: string;
  heading?: string;
  description?: string;
}

const sizeClasses: Record<NonNullable<SectionProps["size"]>, string> = {
  sm: "py-12 sm:py-16",
  md: "py-16 sm:py-24",
  lg: "py-20 sm:py-28",
};

/**
 * Standard page section with optional eyebrow / heading / description.
 * Use everywhere instead of bare <section> so vertical rhythm stays consistent.
 */
export function Section({
  size = "md",
  containerSize = "lg",
  eyebrow,
  heading,
  description,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cn(sizeClasses[size], className)} {...props}>
      <Container size={containerSize}>
        {(eyebrow || heading || description) && (
          <div className="mb-10 max-w-2xl">
            {eyebrow && (
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-widest uppercase">
                {eyebrow}
              </p>
            )}
            {heading && (
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                {heading}
              </h2>
            )}
            {description && (
              <p className="text-muted-foreground mt-3 text-base leading-relaxed text-pretty">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </Container>
    </section>
  );
}
