import { useReducedMotion, useReducedMotionConfig } from "framer-motion";
import { tokens } from "@/brand/theme";

/** The visitor asked for reduced motion, or a MotionConfig asks for stillness (the kit's screenshot harness). */
export function useStillMotion(): boolean {
  const prefersReduced = useReducedMotion();
  const configReduced = useReducedMotionConfig();
  return Boolean(prefersReduced || configReduced);
}

/** How a chart's marks move to a new place (a column re-sorted, a width measured): the kit's layout motion, or straight there when still. */
export function useLayoutTransition() {
  return useStillMotion() ? { duration: 0 } : tokens.motion.layout;
}
