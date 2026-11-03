import { ScanProgress } from "@/brand/components/ScanProgress";

export default function ScanProgressPreview() {
  return (
    <ScanProgress
      label="Reading your card"
      steps={["Course and tees", "Scores and putts", "Checking totals"]}
      phase={1}
    />
  );
}
