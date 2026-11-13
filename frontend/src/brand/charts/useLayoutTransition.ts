import { useReducedMotion, useReducedMotionConfig } from "framer-motion";
import { tokens } from "@/brand/theme";

/**
 * How a chart's marks move to a new place (a column re-sorted, a width measured): the kit's layout
 * motion, or straight there for a visitor who asked for reduced motion, or a MotionConfig asking for
 * stillness (the kit's screenshot harness).
 */
export function useLayoutTransition() {
  const prefersReduced = useReducedMotion();
  const configReduced = useReducedMotionConfig();
  return prefersReduced || configReduced ? { duration: 0 } : tokens.motion.layout;
}
