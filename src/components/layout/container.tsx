import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

/**
 * Centred max-width wrapper used by every page section.
 * Keeps gutters consistent and content readable on wide screens.
 */
type ContainerProps = ComponentPropsWithoutRef<"div"> & {
  size?: "sm" | "md" | "lg";
};

const sizeClasses: Record<NonNullable<ContainerProps["size"]>, string> = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
};

export function Container({ className, size = "lg", ...props }: ContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full px-6 sm:px-8", sizeClasses[size], className)}
      {...props}
    />
  );
}
