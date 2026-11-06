import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { ScoreKind } from "@/domain";
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
  | "lab";

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
  { phase: "lab", label: "8. The Lab", holdMs: 3000 },
];

const TOUR_SCREEN: Partial<Record<ScannerPhase, TourScreen>> = {
  dashboard: "dashboard",
  handicapTap: "dashboard",
  handicap: "handicap",
  analytics: "analytics",
  lab: "lab",
};

const RESULT_INDEX = STEPS.findIndex((step) => step.phase === "result");

export interface DemoScorecardRow {
  hole: number;
  par: number;
  strokes: number;
  putts: number;
  greenInRegulation: boolean;
  toPar: number;
  score: ScoreKind;
}

/**
 * The sample card, written out as the server would read it. It is a demo with no server
 * behind it, so each hole's to par and score kind are fixed here rather than worked out.
 */
const SCORECARD: DemoScorecardRow[] = [
  { hole: 1, par: 4, strokes: 5, putts: 2, greenInRegulation: false, toPar: 1, score: "bogey" },
  { hole: 2, par: 4, strokes: 5, putts: 1, greenInRegulation: false, toPar: 1, score: "bogey" },
  { hole: 3, par: 3, strokes: 3, putts: 2, greenInRegulation: true, toPar: 0, score: "par" },
  { hole: 4, par: 5, strokes: 6, putts: 2, greenInRegulation: false, toPar: 1, score: "bogey" },
  { hole: 5, par: 4, strokes: 5, putts: 2, greenInRegulation: false, toPar: 1, score: "bogey" },
  { hole: 6, par: 4, strokes: 5, putts: 3, greenInRegulation: true, toPar: 1, score: "bogey" },
  { hole: 7, par: 3, strokes: 4, putts: 3, greenInRegulation: true, toPar: 1, score: "bogey" },
  { hole: 8, par: 5, strokes: 6, putts: 2, greenInRegulation: false, toPar: 1, score: "bogey" },
  { hole: 9, par: 3, strokes: 4, putts: 2, greenInRegulation: false, toPar: 1, score: "bogey" },
];

export interface ScannerDemoViewModel {
  phase: ScannerPhase;
  label: string;
  scorecard: DemoScorecardRow[];
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
    scorecard: SCORECARD,
    screen: TOUR_SCREEN[step.phase] ?? null,
    tapping: step.phase === "handicapTap",
    tourPrimed,
  };
}
