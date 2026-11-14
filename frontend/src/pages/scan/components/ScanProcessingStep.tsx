import { ScanProgress } from "@/brand";
import { SCAN_STEPS, scanStepAt } from "@/domain/scan";

interface ScanProcessingStepProps {
  photoUrl: string | null;
  phase: number;
}

export function ScanProcessingStep({ photoUrl, phase }: ScanProcessingStepProps) {
  const step = scanStepAt(phase);
  return <ScanProgress photoUrl={photoUrl} label={step.label} steps={SCAN_STEPS.length} phase={step.phase} className="py-16" />;
}
