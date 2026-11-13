import { ScanProgress } from "@/brand/components/ScanProgress";
import { SCAN_STEPS } from "@/domain/scan";
/** The landing page's photo of a real card, served from public/. */
const scorecardPhoto = "/hero/physical-card.jpg";

export default function ScanProgressPreview() {
  return (
    <div className="flex flex-col gap-8">
      <ScanProgress photoUrl={scorecardPhoto} label={SCAN_STEPS[2]} steps={SCAN_STEPS.length} phase={2} />
      <ScanProgress photoUrl={scorecardPhoto} label={SCAN_STEPS[0]} steps={SCAN_STEPS.length} phase={0} />
    </div>
  );
}
