import { useReducedMotion, useReducedMotionConfig } from "framer-motion";
import { tokens } from "@/brand/theme";

export function useStillMotion(): boolean {
  const prefersReduced = useReducedMotion();
  const configReduced = useReducedMotionConfig();
  return Boolean(prefersReduced || configReduced);
}

export function useLayoutTransition() {
  return useStillMotion() ? { duration: 0 } : tokens.motion.layout;
}
