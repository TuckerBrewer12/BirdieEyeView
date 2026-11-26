import { Button, ScanProgress } from "@/brand";
import { SCAN_STEPS, scanStepAt } from "@/domain/scan";
import { SLOW_READ_NOTE } from "../present";

interface ScanProcessingStepProps {
  photoUrl: string | null;
  phase: number;
  slow: boolean;
  onCancel: () => void;
}

export function ScanProcessingStep({ photoUrl, phase, slow, onCancel }: ScanProcessingStepProps) {
  const step = scanStepAt(phase);
  return (
    <div className="flex flex-col items-center gap-6 py-16">
      <ScanProgress
        photoUrl={photoUrl}
        label={step.label}
        steps={SCAN_STEPS.length}
        phase={step.phase}
        note={slow ? SLOW_READ_NOTE : null}
        className="w-full"
      />
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
