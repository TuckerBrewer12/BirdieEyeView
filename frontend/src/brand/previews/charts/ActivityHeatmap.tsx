import { ActivityHeatmap } from "@/brand/charts/ActivityHeatmap";
import { populatedRounds } from "@/testing/fixtures/rounds";

/** Pinned so the 5-week window does not move under screenshots. */
const TODAY = new Date("2026-09-16T12:00:00.000Z");

const rounds = [
  { ...populatedRounds[0], date: "2026-09-15" },
  { ...populatedRounds[1], date: "2026-09-15T08:00:00" },
  { ...populatedRounds[2], date: "2026-09-10" },
  { ...populatedRounds[3], date: "2026-08-01" },
];

export default function ActivityHeatmapPreview() {
  return <ActivityHeatmap rounds={rounds} today={TODAY} />;
}
