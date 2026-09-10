import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/brand/cn";

interface CollapseProps {
  open: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Reveals its content by wiping it down from zero height, and wipes it back up
 * on the way out.
 *
 * The AnimatePresence is what earns its keep: React unmounts a conditional
 * child immediately, so without it the exit never plays and the panel snaps
 * shut. Children stay unmounted while closed, so a field inside cannot take
 * focus or fetch anything until it is actually on screen.
 */
function Collapse({ open, children, className }: CollapseProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="collapse-content"
          data-slot="collapse"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          // Clips the content while the box is shorter than it is.
          className={cn("overflow-hidden", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { Collapse };
export type { CollapseProps };
