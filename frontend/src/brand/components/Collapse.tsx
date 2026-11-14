import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/brand/cn";
import { tokens } from "@/brand/theme";

interface CollapseProps {
  open: boolean;
  children: ReactNode;
  className?: string;
}

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
          transition={{ duration: tokens.motion.duration.collapse }}
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
