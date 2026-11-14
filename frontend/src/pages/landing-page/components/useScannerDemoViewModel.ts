import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { TourScreen } from "./demoTour";

export type ScannerPhase =
  | "photo"
  | "mapping"
  | "scanning"
  | "result"
  | "dashboard"
  | "handicapTap"
  | "handicap"
  | "analytics"
  | "profile";

interface ScannerStep {
  phase: ScannerPhase;
  label: string;
  holdMs: number;
}

const STEPS: ScannerStep[] = [
  { phase: "photo", label: "1. Snap a photo", holdMs: 1000 },
  { phase: "mapping", label: "2. Say what's on the card", holdMs: 4000 },
  { phase: "scanning", label: "3. Read every hole", holdMs: 1500 },
  { phase: "result", label: "4. Your round", holdMs: 4000 },
  { phase: "dashboard", label: "5. Your dashboard", holdMs: 2500 },
  { phase: "handicapTap", label: "5. Your dashboard", holdMs: 1000 },
  { phase: "handicap", label: "6. Your handicap", holdMs: 3000 },
  { phase: "analytics", label: "7. Your analytics", holdMs: 3000 },
  { phase: "profile", label: "8. Your profile", holdMs: 3000 },
];

const TOUR_SCREEN: Partial<Record<ScannerPhase, TourScreen>> = {
  dashboard: "dashboard",
  handicapTap: "dashboard",
  handicap: "handicap",
  analytics: "analytics",
  profile: "profile",
};

const RESULT_INDEX = STEPS.findIndex((step) => step.phase === "result");

export interface ScannerDemoViewModel {
  phase: ScannerPhase;
  label: string;
  screen: TourScreen | null;
  tapping: boolean;
  tourPrimed: boolean;
}

export function useScannerDemoViewModel(): ScannerDemoViewModel {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [tourPrimed, setTourPrimed] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setTimeout(() => {
      const next = (index + 1) % STEPS.length;
      if (next === RESULT_INDEX) setTourPrimed(true);
      setIndex(next);
    }, STEPS[index].holdMs);
    return () => clearTimeout(timer);
  }, [index, reducedMotion]);

  const step = STEPS[index];
  return {
    phase: step.phase,
    label: step.label,
    screen: TOUR_SCREEN[step.phase] ?? null,
    tapping: step.phase === "handicapTap",
    tourPrimed,
  };
}
