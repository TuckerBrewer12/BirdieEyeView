import { Card, CardContent, CardHeader, CardTitle } from "@/brand";
import { MilestoneFeed } from "../components/MilestoneFeed";
import type { Milestone } from "../model";

const milestones: Milestone[] = [
  { kind: "under_par", value: 69, date: "2026-04-18", course: "Blue Rock", roundId: "round-3" },
  { kind: "putt_break", value: 30, date: "2026-04-18", course: "Blue Rock", roundId: "round-3" },
  { kind: "par_streak", value: 5, date: "2026-03-02", course: "Half Moon Bay", roundId: null },
];

const brokeEighty: Milestone[] = [
  { kind: "score_break", value: 80, date: "2026-06-15", course: "Half Moon Bay Old Course", roundId: "round-1" },
];

/** Drawn at the width of the dashboard's one-column card, where long titles have to wrap. */
function MilestoneCard({ items }: { items: Milestone[] }) {
  return (
    <Card className="w-52">
      <CardHeader>
        <CardTitle>Milestones</CardTitle>
      </CardHeader>
      <CardContent>
        <MilestoneFeed milestones={items} onRoundClick={() => {}} />
      </CardContent>
    </Card>
  );
}

export default function MilestoneFeedPreview() {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <MilestoneCard items={milestones} />
      <MilestoneCard items={brokeEighty} />
      <MilestoneCard items={[]} />
    </div>
  );
}
