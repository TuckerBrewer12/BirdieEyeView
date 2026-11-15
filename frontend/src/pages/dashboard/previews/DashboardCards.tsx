import { populatedDashboard } from "@/testing/fixtures/dashboard";
import { BestRoundCard, GoalCard, ScoreMixCard, ScoringAverageCard } from "../components/DashboardCards";
import { bestRoundFrom } from "../model";

const best = bestRoundFrom(populatedDashboard);
const line = [79.2, 78.6, 78.9, 77.4, 76.8];
const goal = { target: 79, progressPct: 82, onTrack: true };

export default function DashboardCardsPreview() {
  return (
    <div className="flex flex-col gap-6 bg-background p-5">
      <div className="grid w-240 grid-cols-dashboard-cards gap-4">
        <ScoringAverageCard average={76.8} change={-2.1} verdict="good" line={line} />
        <ScoreMixCard mix={populatedDashboard.recent_score_mix} />
        <BestRoundCard best={best} />
        <GoalCard goal={goal} seasonRounds={populatedDashboard.rounds_this_year} />
      </div>
      <div className="grid w-88 grid-cols-2 gap-3">
        <ScoringAverageCard compact average={76.8} change={-2.1} verdict="good" line={line} />
        <BestRoundCard compact best={best} />
        <ScoreMixCard compact mix={populatedDashboard.recent_score_mix} className="col-span-2" />
        <GoalCard compact goal={goal} seasonRounds={populatedDashboard.rounds_this_year} className="col-span-2" />
        <GoalCard compact goal={null} seasonRounds={0} className="col-span-2" />
      </div>
    </div>
  );
}
