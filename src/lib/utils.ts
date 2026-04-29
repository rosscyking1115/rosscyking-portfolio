import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Conditionally join Tailwind class names while merging conflicting utilities.
 * Used by every component that accepts a `className` prop.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
