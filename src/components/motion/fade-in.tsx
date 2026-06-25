"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ComponentPropsWithoutRef } from "react";

interface FadeInProps extends ComponentPropsWithoutRef<typeof motion.div> {
  /** Delay in seconds before this element animates. */
  delay?: number;
  /** Set to `false` to animate on mount instead of when scrolled into view. */
  whenInView?: boolean;
}

const variants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

/**
 * Tiny entrance wrapper. Defaults to viewport-triggered animation so cards
 * down the page reveal as the user scrolls. When the user prefers reduced
 * motion, the content renders immediately at full opacity — no transform, no
 * fade — so motion is never load-bearing and the entrance can't briefly drop
 * text below its contrast threshold.
 */
export function FadeIn({
  delay = 0,
  whenInView = true,
  children,
  ...props
}: FadeInProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <motion.div {...props}>{children}</motion.div>;
  }

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      {...(whenInView
        ? { whileInView: "show", viewport: { once: true, margin: "-80px" } }
        : { animate: "show" })}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Wrap a list and pass `delay={index * 0.08}` to children to stagger reveals.
 * Convenience helper so consumers don't need to import variants directly.
 */
export const STAGGER_STEP = 0.08;
