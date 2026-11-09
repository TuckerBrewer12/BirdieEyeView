import { ActivityCalendar } from "@/brand/charts/ActivityCalendar";
import { Card, CardContent } from "@/brand/components/Card";
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

export default function ActivityCalendarPreview() {
  return (
    <Card>
      <CardContent>
        <ActivityCalendar rounds={rounds} today={TODAY} onOpenRound={() => {}} />
      </CardContent>
    </Card>
  );
}
