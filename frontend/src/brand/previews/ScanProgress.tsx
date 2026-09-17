import { ScanProgress } from "@/brand/components/ScanProgress";

export default function ScanProgressPreview() {
  return (
    <ScanProgress
      label="Extracting hole scores…"
      detail="Parsing your scorecard row by row"
      phase={1}
      phaseCount={4}
    />
  );
}
