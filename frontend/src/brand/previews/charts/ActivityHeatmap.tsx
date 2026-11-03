import { ActivityHeatmap } from "@/brand/charts/ActivityHeatmap";
import { Round } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";

/** Pinned so the month does not move under screenshots. */
const TODAY = new Date(2026, 9, 28, 12);

const PLAYED = [3, 4, 10, 17, 24, 25, 31];

const rounds = PLAYED.map((day, i) => ({
  ...populatedRounds[i % populatedRounds.length],
  id: `october-${day}`,
  date: `2026-10-${String(day).padStart(2, "0")}`,
})).map(Round.fromSummary);

export default function ActivityHeatmapPreview() {
  return (
    <div className="rounded-xl border border-border bg-card px-4.5 py-4">
      <ActivityHeatmap rounds={rounds} today={TODAY} onOpenRound={() => {}} />
    </div>
  );
}
