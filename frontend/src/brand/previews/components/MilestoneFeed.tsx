import { MilestoneFeed } from "@/brand/components/MilestoneFeed";
import type { Milestone } from "@/types/golf";

const milestones: Milestone[] = [
  {
    type: "score_break",
    label: "Best score: 69 or better",
    date: "2026/4/18",
    course: "Blue Rock",
    round_id: "round-3",
  },
  {
    type: "putt_break",
    label: "Fewest putts: 28",
    date: "2026/4/18",
    course: "Blue Rock",
    round_id: "round-3",
  },
  {
    type: "birdie_streak",
    label: "Birdie streak: 3 in a row",
    date: "2026/6/15",
    course: "Half Moon Bay",
  },
];

export default function MilestoneFeedPreview() {
  return (
    <>
      <MilestoneFeed milestones={milestones} onRoundClick={() => {}} />
      <MilestoneFeed milestones={[]} />
    </>
  );
}
