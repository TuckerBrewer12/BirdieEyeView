import { useCallback, useEffect, useState } from "react";
import { usePublicScan } from "@/hooks/usePublicScan";
import type { ScorecardHole } from "@/brand";
import { coursePar, getHole } from "@/domain";
import type { ExtractedHoleScore, ScanResult } from "@/types/scan";

const PHASES = [
  { label: "Reading course details…", detail: "Identifying name, location & tee boxes" },
  { label: "Extracting hole scores…", detail: "Parsing your scorecard row by row" },
  { label: "Verifying yardages & par…", detail: "Cross-checking hole data" },
  { label: "Calculating confidence…", detail: "Flagging fields that may need review" },
] as const;

const PHASE_HOLD_MS = 3500;

export interface TryItYourselfViewModel {
  step: "upload" | "processing" | "review";
  file: File | null;
  preview: string | null;
  error: string | null;
  extracting: boolean;
  setUserContext: (context: string) => void;
  handleFile: (file: File) => void;
  extract: () => void;
  reset: () => void;

  phase: number;
  phaseCount: number;
  phaseLabel: string;
  phaseDetail: string;

  courseName: string | null;
  courseLocation: string | null;
  teeBox: string | null;
  frontNine: ScorecardHole[];
  backNine: ScorecardHole[];
  roundTotal: { par: number | null; strokes: number | null };
  hasScores: boolean;
}

function parFor(result: ScanResult, score: ExtractedHoleScore, index: number): number | null {
  return getHole(result.round.course, score.hole_number ?? index + 1)?.par ?? null;
}

function toRows(result: ScanResult | null, from: number, to: number): ScorecardHole[] {
  if (!result) return [];
  return (result.round.hole_scores ?? []).slice(from, to).map((score, i) => ({
    hole: score.hole_number ?? from + i + 1,
    par: parFor(result, score, from + i),
    strokes: score.strokes,
    putts: score.putts,
    greenInRegulation: score.green_in_regulation,
    shotsToGreen: score.shots_to_green,
  }));
}

export function useTryItYourselfViewModel(): TryItYourselfViewModel {
  const scan = usePublicScan();
  const [phase, setPhase] = useState(0);

  // The scan gives no progress events, so the phases are paced rather than
  // reported. Restarting at zero each time keeps a second scan from opening
  // on "Calculating confidence…".
  useEffect(() => {
    if (scan.step !== "processing") return;
    const timer = setInterval(
      () => setPhase((current) => Math.min(current + 1, PHASES.length - 1)),
      PHASE_HOLD_MS,
    );
    return () => {
      clearInterval(timer);
      setPhase(0);
    };
  }, [scan.step]);

  const extract = useCallback(() => {
    void scan.handleExtract();
  }, [scan]);

  const result = scan.result;
  const scores = result?.round.hole_scores ?? [];

  return {
    step: scan.step,
    file: scan.file,
    preview: scan.preview,
    error: scan.error,
    extracting: scan.extracting,
    setUserContext: scan.setUserContext,
    handleFile: scan.handleFile,
    extract,
    reset: scan.reset,

    phase,
    phaseCount: PHASES.length,
    phaseLabel: PHASES[phase].label,
    phaseDetail: PHASES[phase].detail,

    courseName: result?.round.course?.name ?? null,
    courseLocation: result?.round.course?.location ?? null,
    teeBox: result?.round.tee_box ?? null,
    frontNine: toRows(result, 0, 9),
    backNine: toRows(result, 9, 18),
    roundTotal: {
      par: coursePar(result?.round.course),
      strokes: scores.reduce((total, score) => total + (score.strokes ?? 0), 0) || null,
    },
    hasScores: scores.length > 0,
  };
}
