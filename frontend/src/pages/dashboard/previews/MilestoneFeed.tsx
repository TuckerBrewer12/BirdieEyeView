import { Card } from "@/brand";
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

/** Drawn at the width of the dashboard's right-hand column. */
function MilestoneCard({ items }: { items: Milestone[] }) {
  return (
    <Card className="w-80 gap-3.5 px-5 py-4.5">
      <h2 className="text-body-lg font-semibold text-foreground">Milestones</h2>
      <MilestoneFeed milestones={items} onRoundClick={() => {}} />
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
