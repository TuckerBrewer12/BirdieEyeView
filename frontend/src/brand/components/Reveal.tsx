import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/brand/cn";

interface RevealProps extends React.ComponentProps<"div"> {
  /** Seconds to wait before this one starts, for staggering a row. */
  delay?: number;
  /** How much of the element must be on screen before it plays. */
  amount?: number;
}

/**
 * Fades a section up as it scrolls into view, once.
 *
 * Replaces the landing page's `ScrollSection`, which had been reduced to a bare
 * `<div>` that swallowed its own `delay` and `amount` props — every caller was
 * passing a stagger that did nothing.
 *
 * Holds still for a visitor who asked for reduced motion: entrances are
 * decoration, and a page that moves on scroll is the thing that setting is for.
 */
function Reveal({ className, children, delay = 0, amount = 0.2, ...props }: RevealProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <div data-slot="reveal" className={className} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      data-slot="reveal"
      className={cn(className)}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}

export { Reveal };
