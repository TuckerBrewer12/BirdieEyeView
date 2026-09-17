import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { scoreFill, toParTextClass } from "@/brand";

export type ScannerPhase = "photo" | "mapping" | "scanning" | "result";

interface ScannerStep {
  phase: ScannerPhase;
  label: string;
  /** How long this step stays on screen before the next one takes over. */
  holdMs: number;
}

const STEPS: ScannerStep[] = [
  { phase: "photo", label: "1. Snap a Photo", holdMs: 1000 },
  { phase: "mapping", label: "2. Tell it what to read", holdMs: 4000 },
  { phase: "scanning", label: "3. AI Extraction", holdMs: 1500 },
  { phase: "result", label: "4. Pure Clean Stats", holdMs: 5000 },
];

/** One hole of the sample card the demo resolves to, ready to render. */
export interface DemoScorecardRow {
  hole: number;
  par: number;
  strokes: number;
  putts: number;
  greenInRegulation: boolean;
  toPar: string;
  toParTextClass: string;
  fill: string;
}

const SAMPLE = {
  par: [4, 4, 3, 5, 4, 4, 3, 5, 3],
  strokes: [5, 5, 3, 6, 5, 5, 4, 6, 4],
  putts: [2, 1, 2, 2, 2, 3, 3, 2, 2],
  gir: [false, false, true, false, false, true, true, false, false],
};

function toParLabelFor(strokes: number, par: number): string {
  const diff = strokes - par;
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff}` : `${diff}`;
}

const SCORECARD: DemoScorecardRow[] = SAMPLE.par.map((par, i) => ({
  hole: i + 1,
  par,
  strokes: SAMPLE.strokes[i],
  putts: SAMPLE.putts[i],
  greenInRegulation: SAMPLE.gir[i],
  toPar: toParLabelFor(SAMPLE.strokes[i], par),
  toParTextClass: toParTextClass(SAMPLE.strokes[i] - par),
  // The real score palette, so the demo teaches the legend the app uses.
  fill: scoreFill(SAMPLE.strokes[i], par),
}));

/**
 * The demo's cinematic timings, in seconds.
 *
 * Deliberately not the kit's motion tokens. Those describe interaction —
 * `duration.collapse` is the 0.2s a panel takes to open, `hoverScale` the
 * 1.5% a card lifts under a cursor. Nothing here is an interaction: the sweep
 * is a scanner crossing a card, the crossfade is one image replacing another.
 * Collapsing them onto the interaction tokens would erase the effect rather
 * than standardise it. They live together here so the demo's rework can tune
 * them as a set.
 */
export const DEMO_MOTION = {
  /** One image replacing another — the card giving way to the scorecard. */
  crossfade: 0.8,
  /** The scan line's full travel, top to bottom. */
  sweep: 1.5,
  /** A field or chip drawing the eye as the form fills itself in. */
  emphasis: 0.3,
  /** A choice registering, matching the kit's collapse. */
  select: 0.2,
  /** One on/off of the text caret in the name field. */
  caretBlink: 0.8,
  /** Mapped rows sliding in from the right. Looser than the kit's spring so
   *  the rows overshoot enough to read as dropped into place. */
  rowSpring: { type: "spring" as const, damping: 15 },
} as const;

export interface ScannerDemoViewModel {
  phase: ScannerPhase;
  label: string;
  scorecard: DemoScorecardRow[];
}

/**
 * Drives the hero's four-step scan loop.
 *
 * The loop is decoration, so it does not run for a visitor who asked for
 * reduced motion — they get the first step and nothing moves. That also makes
 * the hero deterministic under test, which is what lets it have a screenshot
 * baseline at all.
 */
export function useScannerDemoViewModel(): ScannerDemoViewModel {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setTimeout(
      () => setIndex((current) => (current + 1) % STEPS.length),
      STEPS[index].holdMs,
    );
    return () => clearTimeout(timer);
  }, [index, reducedMotion]);

  const step = STEPS[index];
  return { phase: step.phase, label: step.label, scorecard: SCORECARD };
}
