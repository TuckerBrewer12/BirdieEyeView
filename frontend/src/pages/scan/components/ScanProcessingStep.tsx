import { ScanProgress } from "@/brand";

const PHASES = [
  { label: "Reading course details…", detail: "Identifying name, location & tee boxes" },
  { label: "Extracting hole scores…", detail: "Parsing your scorecard row by row" },
  { label: "Verifying yardages & par…", detail: "Cross-checking hole data" },
  { label: "Calculating confidence…", detail: "Flagging fields that may need review" },
] as const;

interface ScanProcessingStepProps {
  /** Which phase of reading the card to show. */
  phase: number;
}

/** The card being read. The scan reports no progress, so the phases are paced, not measured. */
export function ScanProcessingStep({ phase }: ScanProcessingStepProps) {
  const shown = Math.min(Math.max(phase, 0), PHASES.length - 1);
  return (
    <ScanProgress
      label={PHASES[shown].label}
      detail={PHASES[shown].detail}
      phase={shown}
      phaseCount={PHASES.length}
      className="py-16"
    />
  );
}
