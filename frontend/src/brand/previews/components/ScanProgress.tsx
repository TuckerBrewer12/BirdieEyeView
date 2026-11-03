import { ScanNeedsReview } from "@/brand/components/ScanNeedsReview";
import { ScanProgress } from "@/brand/components/ScanProgress";
import { ScanSaved } from "@/brand/components/ScanSaved";

const STEPS = ["Course and tees", "Scores and putts", "Checking totals"];

const noop = () => {};

export default function ScanProgressPreview() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="text-label font-semibold text-muted-foreground">Reading</div>
        <ScanProgress label="Reading your card" steps={STEPS} phase={1} />
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-label font-semibold text-muted-foreground">Needs a look</div>
        <ScanNeedsReview holes={[4, 11, 16]} onReview={noop} />
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-label font-semibold text-muted-foreground">Saved</div>
        <ScanSaved course="Half Moon Bay Golf Links" score={79} toPar={8} onView={noop} onShare={noop} />
      </div>
    </div>
  );
}
