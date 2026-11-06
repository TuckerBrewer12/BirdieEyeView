import { ScanProgress } from "@/brand";

const PHASES = [
  { label: "Reading course details…", detail: "Identifying name, location & tee boxes" },
  { label: "Extracting hole scores…", detail: "Parsing your scorecard row by row" },
  { label: "Verifying yardages & par…", detail: "Cross-checking hole data" },
  { label: "Calculating confidence…", detail: "Flagging fields that may need review" },
] as const;

interface ScanProcessingStepProps {
  phase: number;
}

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
