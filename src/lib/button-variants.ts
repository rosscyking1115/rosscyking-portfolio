import { cn } from "./utils";

/**
 * Button styling, ported from the `cva` config in src/components/ui/button.tsx.
 *
 * Written as a plain function rather than pulling in `class-variance-authority`
 * and `@radix-ui/react-slot`. Both existed only to serve React: cva for typed
 * variants, Slot for `asChild` so a Button could render an <a>. In Astro the
 * button and link cases are separate elements sharing one class string, so a
 * function over a lookup table does the same job with no runtime dependency and
 * no React island for a link.
 *
 * The class strings themselves are byte-identical to the Next version, so a
 * button here and a button there render the same.
 */
export type ButtonVariant = "default" | "outline" | "ghost" | "link";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-[color,background-color,border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

const VARIANTS: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:shadow-lift",
  outline: "border border-input bg-background hover:bg-muted",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  link: "text-primary underline-offset-4 hover:underline",
};

const SIZES: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3",
  lg: "h-11 px-8",
  icon: "size-10",
};

export function buttonVariants({
  variant = "default",
  size = "default",
  class: className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  class?: string;
} = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}
