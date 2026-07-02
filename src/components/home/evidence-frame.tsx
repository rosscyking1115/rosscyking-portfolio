import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Shared chrome for showcase evidence: a 1px-bordered frame with a title bar
 * (three window dots + a mono caption + optional status), holding either a
 * live-demo screenshot or a terminal readout. The frame is the section's
 * signature — every visual is presented as an instrument reading, not a
 * decorative image.
 */

function FrameChrome({
  caption,
  live,
  children,
  className,
}: {
  /** Mono text in the title bar — the demo's hostname or a run label. */
  caption: string;
  /** Show the "live" status dot — true when a public demo backs the visual. */
  live?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "border-border bg-muted/60 overflow-hidden rounded-lg border shadow-xs",
        className,
      )}
    >
      <figcaption className="border-border/60 flex items-center gap-2 border-b px-3 py-2">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="bg-border size-2 rounded-full" />
          <span className="bg-border size-2 rounded-full" />
          <span className="bg-border size-2 rounded-full" />
        </span>
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-center font-mono text-[11px]">
          {caption}
        </span>
        {live ? (
          <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            Live
          </span>
        ) : (
          // Mirror the dots' width so the caption stays optically centered.
          <span className="w-[26px]" aria-hidden="true" />
        )}
      </figcaption>
      {children}
    </figure>
  );
}

export function ScreenshotFrame({
  src,
  alt,
  caption,
  live,
  sizes,
  className,
}: {
  src: string;
  alt: string;
  caption: string;
  live?: boolean;
  /** next/image responsive sizes for this slot. */
  sizes: string;
  className?: string;
}) {
  return (
    <FrameChrome caption={caption} live={live} className={className}>
      {/* Fixed ratio so every card crops identically; screenshots are 16:10. */}
      <div className="relative aspect-[16/10]">
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover object-top transition-transform duration-300 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>
    </FrameChrome>
  );
}

export function TerminalFrame({
  lines,
  caption,
  className,
}: {
  lines: string[];
  caption: string;
  className?: string;
}) {
  return (
    <FrameChrome caption={caption} className={className}>
      <div className="bg-card flex aspect-[16/10] flex-col justify-center gap-2 px-5 font-mono text-[11px] leading-relaxed sm:px-6 sm:text-xs">
        {lines.map((line) => (
          <p
            key={line}
            className={
              line.startsWith("$")
                ? "text-foreground"
                : "text-muted-foreground before:content-none"
            }
          >
            {line}
          </p>
        ))}
      </div>
    </FrameChrome>
  );
}
