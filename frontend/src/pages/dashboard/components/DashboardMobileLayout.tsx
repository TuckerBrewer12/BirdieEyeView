import type { DashboardPageViewModel } from "../useDashboardPageViewModel";
import { firstNameOf, greetingFor } from "../present";
import { BestRoundCard, GoalCard, ScoringAverageCard } from "./DashboardCards";
import { RecentRounds } from "./RecentRounds";
import { GreetingHeader } from "./GreetingHeader";
import { LastRoundCard } from "./LastRoundCard";

/** The phone dashboard: one column, the last round first and the rounds before it last. */
export function DashboardMobileLayout({ vm }: { vm: DashboardPageViewModel }) {
  const { data } = vm;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <GreetingHeader
        compact
        greeting={greetingFor(new Date())}
        name={firstNameOf(vm.user)}
        handicap={vm.handicap}
        handicapLine={vm.handicapLine}
        onHandicapClick={vm.openHandicapSheet}
      />

      {vm.lastRound && <LastRoundCard compact round={vm.lastRound} flow={vm.lastRoundFlow} />}

      <div className="grid grid-cols-2 gap-3">
        <ScoringAverageCard
          compact
          average={data.scoring_average_l5}
          change={data.scoring_average_change}
          verdict={data.scoring_average_verdict}
          line={vm.averageLine}
        />
        <BestRoundCard compact best={vm.best} />
        <GoalCard compact goal={vm.goal} seasonRounds={vm.roundsThisYear} className="col-span-2" />
      </div>

      <RecentRounds compact rounds={vm.recentRounds} />
    </div>
  );
}
