import { ScoreHandicapOverlay, ScoreHandicapOverlayLegend } from "@/brand/charts/ScoreHandicapOverlay";
import { trendPointsFrom } from "@/domain";
import { populatedDashboard } from "@/testing/fixtures/dashboard";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";

const fiveRounds = trendPointsFrom(populatedDashboard);
const twentyRounds = trendPointsFrom(sampleGolfer.dashboard);

/** The scores card's plot: five rounds at desktop size, twenty on a phone, and too few to draw. */
export default function ScoreHandicapOverlayPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 flex flex-col gap-6 overflow-auto bg-background p-6">
      <div className="flex w-chart-overlay flex-col gap-3 rounded-surface bg-card px-5 py-4.5 shadow-surface">
        <ScoreHandicapOverlayLegend />
        <ScoreHandicapOverlay data={fiveRounds} />
      </div>
      <div className="flex items-start gap-6">
        <div className="w-preview rounded-surface bg-card px-4 py-3.5 shadow-surface">
          <ScoreHandicapOverlay data={twentyRounds} compact />
        </div>
        <div className="w-preview rounded-surface bg-card px-4 py-3.5 shadow-surface">
          <ScoreHandicapOverlay data={fiveRounds.slice(0, 1)} compact />
        </div>
      </div>
    </div>
  );
}
