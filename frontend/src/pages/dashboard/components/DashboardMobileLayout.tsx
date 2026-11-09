import { Link, useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Collection,
  RoundPreview,
  ScoreHandicapOverlay,
  ScoreHandicapOverlayLegend,
  ScoreMixBar,
} from "@/brand";
import { GoalCard } from "./GoalCard";
import { GreetingHeader } from "./GreetingHeader";
import { ScoringHeroCard } from "./ScoringHeroCard";
import { ShortGameCard } from "./ShortGameCard";
import { WindowSwitch } from "./WindowSwitch";
import type { DashboardPageViewModel } from "../useDashboardPageViewModel";
import { greetingOf } from "../present";

/** The phone dashboard: one column, the scoring average first and the rounds last. */
export function DashboardMobileLayout({ vm }: { vm: DashboardPageViewModel }) {
  const navigate = useNavigate();
  const { data, figures } = vm;
  if (!data || !figures) return null;

  const openRound = (id: string) => void navigate(`/rounds/${id}`);
  const bestId = data.best_round_id;

  return (
    <div className="flex flex-col gap-3.5">
      <GreetingHeader
        greeting={greetingOf(vm.user)}
        handicapIndex={data.handicap_index}
        handicapChange={figures.handicapChange}
        handicapVerdict={figures.handicapVerdict}
        onHandicapClick={vm.openHandicapSheet}
      />

      <WindowSwitch value={vm.window} onChange={vm.setWindow} size="sm" className="self-start" />

      <ScoringHeroCard
        average={figures.scoringAverage}
        change={figures.scoringAverageChange}
        changeVerdict={figures.scoringAverageVerdict}
        line={vm.averageLine}
        bestRound={data.best_round}
        bestCourse={data.best_round_course}
        totalRounds={data.total_rounds}
        onBestClick={bestId ? () => openRound(bestId) : undefined}
      />

      {figures.scoreMix && (
        <Card className="gap-2.5 px-4 py-3.5">
          <h2 className="text-body-lg font-semibold text-foreground">Score mix</h2>
          <ScoreMixBar mix={figures.scoreMix} legend="key" />
        </Card>
      )}

      <Card className="gap-2.5 px-4 py-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-body-lg font-semibold text-foreground">Scores</h2>
          <ScoreHandicapOverlayLegend />
        </div>
        <ScoreHandicapOverlay data={vm.trend} compact />
      </Card>

      <GoalCard goal={vm.goal} onOpen={() => void navigate("/the-lab")} compact />

      <ShortGameCard scramblingPct={figures.scramblingPct} upAndDownPct={figures.upAndDownPct} />

      <section className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between px-1 pt-1.5">
          <h2 className="text-lg font-semibold text-foreground">Recent rounds</h2>
          <Button variant="link" className="px-0" nativeButton={false} render={<Link to="/rounds" />}>
            View all
          </Button>
        </div>
        <Card className="gap-0 py-0">
          <Collection
            layout="divided"
            className="divide-chart-grid"
            items={vm.phoneRounds}
            keyFor={(round) => round.id}
            empty="No rounds yet"
            renderItem={(round) => (
              <RoundPreview variant="compact" layout="stacked" round={round} onClick={() => openRound(round.id)} />
            )}
          />
        </Card>
      </section>
    </div>
  );
}
