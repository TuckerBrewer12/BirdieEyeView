import type { DashboardPageViewModel } from "../useDashboardPageViewModel";
import { firstNameOf, greetingFor } from "../present";
import { BestRoundCard, GoalCard, ScoreMixCard, ScoringAverageCard } from "./DashboardCards";
import { RecentRounds } from "./RecentRounds";
import { GreetingHeader } from "./GreetingHeader";
import { LastRoundCard } from "./LastRoundCard";

/** The wide dashboard: the last round first, then the figures in a row, then the rounds before. */
export function DashboardDesktopLayout({ vm }: { vm: DashboardPageViewModel }) {
  const { data } = vm;
  if (!data) return null;

  return (
    <div className="flex max-w-240 flex-col gap-5">
      <GreetingHeader
        greeting={greetingFor(new Date())}
        name={firstNameOf(vm.user)}
        handicap={vm.handicap}
        handicapLine={vm.handicapLine}
        onHandicapClick={vm.openHandicapSheet}
      />

      {vm.lastRound && <LastRoundCard round={vm.lastRound} flow={vm.lastRoundFlow} />}

      <div className="grid grid-cols-dashboard-cards gap-4">
        <ScoringAverageCard
          average={data.scoring_average_l5}
          change={data.scoring_average_change}
          verdict={data.scoring_average_verdict}
          line={vm.averageLine}
        />
        <ScoreMixCard mix={vm.recentMix} />
        <BestRoundCard best={vm.best} />
        <GoalCard goal={vm.goal} seasonRounds={vm.roundsThisYear} />
      </div>

      <RecentRounds rounds={vm.recentRounds} />
    </div>
  );
}
