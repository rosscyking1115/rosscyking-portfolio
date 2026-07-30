import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Conditionally join Tailwind class names while merging conflicting utilities.
 * Ported verbatim from the Next app — every component that accepts a
 * `class`/`className` prop uses it.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
