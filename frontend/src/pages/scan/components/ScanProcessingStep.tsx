import { ScanProgress } from "@/brand";
import { SCAN_STEPS, scanStepAt } from "@/domain/scan";

interface ScanProcessingStepProps {
  /** The photo being read. */
  photoUrl: string | null;
  /** Which step of reading the card to show. */
  phase: number;
}

/** The card being read. The scan reports no progress, so the steps are paced, not measured. */
export function ScanProcessingStep({ photoUrl, phase }: ScanProcessingStepProps) {
  const step = scanStepAt(phase);
  return <ScanProgress photoUrl={photoUrl} label={step.label} steps={SCAN_STEPS.length} phase={step.phase} className="py-16" />;
}
