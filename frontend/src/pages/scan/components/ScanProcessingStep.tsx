import { ScanProgress } from "@/brand";
import { SCAN_READING_LABEL, SCAN_STEPS } from "@/domain/scan";

interface ScanProcessingStepProps {
  /** Which phase of reading the card to show. */
  phase: number;
}

/** The card being read. The scan reports no progress, so the phases are paced, not measured. */
export function ScanProcessingStep({ phase }: ScanProcessingStepProps) {
  const shown = Math.min(Math.max(phase, 0), SCAN_STEPS.length - 1);
  return <ScanProgress label={SCAN_READING_LABEL} steps={SCAN_STEPS} phase={shown} className="mx-auto my-16 w-full max-w-sm" />;
}
