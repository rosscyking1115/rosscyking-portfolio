import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "../../lib/utils";

/**
 * Form primitives, ported from src/components/ui/{input,textarea,label}.tsx.
 *
 * These stay React rather than becoming .astro components because the only
 * thing that uses them is the contact form, which has to be an island —
 * react-hook-form's `register()` returns a ref and change handlers that only
 * mean anything inside React.
 *
 * Two things dropped along the way:
 *
 *   - `forwardRef`. React 19 passes `ref` through as an ordinary prop, so the
 *     wrapper is dead weight; `{...props}` carries it.
 *   - `@radix-ui/react-label`. The Next Label existed only to render a <label>
 *     with a class. Radix's version adds click-to-focus for controls that are
 *     not natively labelable — every control here is, and each already has a
 *     matching htmlFor/id pair, so the browser does it for free. That is one
 *     fewer dependency and one fewer "use client" boundary.
 *
 * The class strings are byte-identical to the Next versions.
 */

const FIELD_BASE = [
  "border-input bg-background ring-offset-background w-full rounded-md border px-3 py-2 text-sm ease-instrument transition-colors duration-[var(--motion-state)]",
  "placeholder:text-muted-foreground",
  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive",
];

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("flex h-10", FIELD_BASE, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("flex min-h-20", FIELD_BASE, className)} {...props} />;
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}

/** The one icon the island needs, inlined so it does not pull in lucide-react. */
export function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
      aria-hidden="true"
    >
      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
      <path d="m21.854 2.147-10.94 10.939" />
    </svg>
  );
}
