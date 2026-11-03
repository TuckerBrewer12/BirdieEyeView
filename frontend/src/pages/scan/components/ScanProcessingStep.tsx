import { ScanProgress } from "@/brand";

const STEPS = ["Course and tees", "Scores and putts", "Yardages and par", "Checking totals"];

interface ScanProcessingStepProps {
  /** Which phase of reading the card to show. */
  phase: number;
}

/** The card being read. The scan reports no progress, so the phases are paced, not measured. */
export function ScanProcessingStep({ phase }: ScanProcessingStepProps) {
  const shown = Math.min(Math.max(phase, 0), STEPS.length - 1);
  return <ScanProgress label="Reading your card" steps={STEPS} phase={shown} className="mx-auto my-16 w-full max-w-sm" />;
}
