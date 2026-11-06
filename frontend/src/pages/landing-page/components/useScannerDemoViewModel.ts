import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { scoreKind, strokesToPar, type ScoreKind } from "@/domain";
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
  /** How long this step stays on screen before the next one takes over. */
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

/** The app screen each step of the tour shows, once the scan has landed in the app. */
const TOUR_SCREEN: Partial<Record<ScannerPhase, TourScreen>> = {
  dashboard: "dashboard",
  handicapTap: "dashboard",
  handicap: "handicap",
  analytics: "analytics",
  lab: "lab",
};

const RESULT_INDEX = STEPS.findIndex((step) => step.phase === "result");

/** One hole of the sample card the demo resolves to, ready to render. */
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
 * The sample card, written out as the server would read it. To par and the score kind
 * come from strokes and par, the same way a saved hole does.
 */
const SCORECARD: DemoScorecardRow[] = (
  [
    { hole: 1, par: 4, strokes: 5, putts: 2, greenInRegulation: false },
    { hole: 2, par: 4, strokes: 5, putts: 1, greenInRegulation: false },
    { hole: 3, par: 3, strokes: 3, putts: 2, greenInRegulation: true },
    { hole: 4, par: 5, strokes: 6, putts: 2, greenInRegulation: false },
    { hole: 5, par: 4, strokes: 5, putts: 2, greenInRegulation: false },
    { hole: 6, par: 4, strokes: 5, putts: 3, greenInRegulation: true },
    { hole: 7, par: 3, strokes: 4, putts: 3, greenInRegulation: true },
    { hole: 8, par: 5, strokes: 6, putts: 2, greenInRegulation: false },
    { hole: 9, par: 3, strokes: 4, putts: 2, greenInRegulation: false },
  ] satisfies Omit<DemoScorecardRow, "toPar" | "score">[]
).map((hole) => {
  const toPar = strokesToPar(hole.strokes, hole.par);
  const score = scoreKind(hole.strokes, hole.par);
  if (toPar == null || score == null) {
    throw new Error("A demo hole always has strokes and par.");
  }
  return { ...hole, toPar, score };
});

export interface ScannerDemoViewModel {
  phase: ScannerPhase;
  label: string;
  scorecard: DemoScorecardRow[];
  /** The app screen on show, or null while the card is still being scanned. */
  screen: TourScreen | null;
  /** The handicap is being tapped, about to open its breakdown. */
  tapping: boolean;
  /**
   * The tour's captures should start loading. Set once the scan reaches its result, so
   * they arrive during that step instead of with the page.
   */
  tourPrimed: boolean;
}

/**
 * Drives the hero's loop: the scan, then a tour of the app it lands in.
 *
 * The loop is decoration, so it does not run for a visitor who asked for
 * reduced motion — they get the first step and nothing moves. That also makes
 * the hero deterministic under test, which is what lets it have a screenshot
 * baseline at all.
 */
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
