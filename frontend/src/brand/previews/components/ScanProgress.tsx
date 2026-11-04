import { ScanProgress } from "@/brand/components/ScanProgress";
import { SCAN_STEPS } from "@/domain/scan";

export default function ScanProgressPreview() {
  return (
    <ScanProgress
      label="Reading your card"
      steps={SCAN_STEPS}
      phase={1}
    />
  );
}
