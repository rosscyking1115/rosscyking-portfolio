import type { ComponentPropsWithoutRef } from "react";

import { Container } from "@/components/layout/container";
import { IndexMark } from "@/components/layout/index-mark";
import { cn } from "@/lib/utils";

interface SectionProps extends ComponentPropsWithoutRef<"section"> {
  size?: "sm" | "md" | "lg";
  containerSize?: "sm" | "md" | "lg";
  eyebrow?: string;
  /** When set, the eyebrow renders as a registration mark: `[ index ] —— eyebrow`. */
  index?: string;
  heading?: string;
  /** Heading semantic level. Use "h1" once per page; default "h2". */
  headingAs?: "h1" | "h2";
  description?: string;
}

const sizeClasses: Record<NonNullable<SectionProps["size"]>, string> = {
  sm: "py-12 sm:py-16",
  md: "py-16 sm:py-24",
  lg: "py-20 sm:py-28",
};

export function Section({
  size = "md",
  containerSize = "lg",
  eyebrow,
  index,
  heading,
  headingAs = "h2",
  description,
  className,
  children,
  ...props
}: SectionProps) {
  const HeadingTag = headingAs;
  return (
    <section className={cn(sizeClasses[size], className)} {...props}>
      <Container size={containerSize}>
        {(eyebrow || heading || description) && (
          <div className="mb-10 max-w-2xl">
            {index ? (
              <IndexMark mark={index} label={eyebrow} className="mb-3" />
            ) : (
              eyebrow && (
                <p className="text-muted-foreground mb-2 text-xs font-medium tracking-widest uppercase">
                  {eyebrow}
                </p>
              )
            )}
            {heading && (
              <HeadingTag className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                {heading}
              </HeadingTag>
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
