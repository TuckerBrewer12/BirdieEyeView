import { Link, useNavigate } from "react-router-dom";
import {
  ActivityCalendar,
  Button,
  Card,
  Collection,
  RoundPreview,
  ScoreHandicapOverlay,
  ScoreHandicapOverlayLegend,
  ScoreMixBar,
  StatStrip,
  StatStripItem,
} from "@/brand";
import { formatHandicapIndex, formatOneDecimal, formatPercent } from "@/domain";
import { GoalCard } from "./GoalCard";
import { MilestoneFeed } from "./MilestoneFeed";
import { WindowSwitch } from "./WindowSwitch";
import type { DashboardPageViewModel } from "../useDashboardPageViewModel";
import { bestLabel, greetingOf, moveOf } from "../present";

/** The wide dashboard: the figures in one strip, then the scores, the goal and the rounds. */
export function DashboardDesktopLayout({ vm }: { vm: DashboardPageViewModel }) {
  const navigate = useNavigate();
  const { data, figures } = vm;
  if (!data || !figures) return null;

  const openRound = (id: string) => void navigate(`/rounds/${id}`);
  const bestId = data.best_round_id;
  const handicapMove = moveOf(figures.handicapChange);
  const averageMove = moveOf(figures.scoringAverageChange);

  return (
    <div className="flex max-w-240 flex-col gap-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-heading text-foreground">{greetingOf(vm.user)}</h1>
        <WindowSwitch value={vm.window} onChange={vm.setWindow} />
      </div>

      <StatStrip>
        <StatStripItem
          label="Handicap"
          value={formatHandicapIndex(data.handicap_index)}
          delta={handicapMove.amount}
          direction={handicapMove.direction}
          tone={figures.handicapVerdict ?? "neutral"}
          trend={vm.handicapLine}
          onClick={vm.openHandicapSheet}
        />
        <StatStripItem
          label="Scoring avg"
          value={formatOneDecimal(figures.scoringAverage)}
          delta={averageMove.amount}
          direction={averageMove.direction}
          tone={figures.scoringAverageVerdict ?? "neutral"}
          trend={vm.averageLine}
        />
        <StatStripItem
          label={bestLabel(data.best_round_course)}
          value={data.best_round ?? "—"}
          onClick={bestId ? () => openRound(bestId) : undefined}
        />
        <StatStripItem label="Rounds played" value={data.total_rounds} />
        <StatStripItem label="Scrambling" value={formatPercent(figures.scramblingPct)} trend={vm.scramblingLine} />
      </StatStrip>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 gap-3 px-5 py-4.5">
          <div className="flex items-center justify-between">
            <h2 className="text-body-lg font-semibold text-foreground">Scores</h2>
            <ScoreHandicapOverlayLegend />
          </div>
          <ScoreHandicapOverlay data={vm.trend} />
          {figures.scoreMix && (
            <>
              <div className="h-px bg-chart-grid" />
              <ScoreMixBar mix={figures.scoreMix} legend="key" size="lg" />
            </>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <GoalCard goal={vm.goal} onOpen={() => void navigate("/the-lab")} />
          <Card className="flex-1 gap-3.5 px-5 py-4.5">
            <h2 className="text-body-lg font-semibold text-foreground">Milestones</h2>
            <MilestoneFeed milestones={vm.milestones} onRoundClick={openRound} />
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 gap-0 py-2">
          <div className="flex items-center justify-between px-5 pt-2.5 pb-1.5">
            <h2 className="text-body-lg font-semibold text-foreground">Recent rounds</h2>
            <Button variant="link" size="sm" className="px-0" nativeButton={false} render={<Link to="/rounds" />}>
              View all
            </Button>
          </div>
          <Collection
            layout="divided"
            className="divide-chart-grid"
            items={vm.recentRounds}
            keyFor={(round) => round.id}
            empty="No rounds yet"
            renderItem={(round) => <RoundPreview variant="compact" round={round} onClick={() => openRound(round.id)} />}
          />
        </Card>

        <Card className="gap-0 px-4.5 py-4">
          <ActivityCalendar variant="month" rounds={vm.rounds} onOpenRound={openRound} />
        </Card>
      </div>
    </div>
  );
}
