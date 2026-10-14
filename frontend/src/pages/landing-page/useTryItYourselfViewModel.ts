import { useCallback, useEffect, useMemo, useState } from "react";
import { usePublicScan } from "@/hooks/usePublicScan";
import { Round } from "@/domain";

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

  /** The scanned card as a round, its figures read the way an unsaved edit's are. */
  round: Round | null;
  hasScores: boolean;
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
  const round = useMemo(() => (result ? Round.fromScan(result.round) : null), [result]);

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

    round,
    hasScores: (round?.holes.length ?? 0) > 0,
  };
}
