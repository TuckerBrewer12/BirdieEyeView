import { useNavigate, Link } from "react-router-dom";
import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  Collection,
  RoundPreview,
  SVGScoreHandicapTrend,
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
import { GoalCard } from "./components/GoalCard";
import { GreetingHeader } from "./components/GreetingHeader";
import { ScoringHeroCard } from "./components/ScoringHeroCard";
import { ShortGameCard } from "./components/ShortGameCard";
import type { DashboardPageViewModel } from "./useDashboardPageViewModel";
import { firstNameOf, greetingDateLabel } from "./present";

export function MobileDashboard({ vm }: { vm: DashboardPageViewModel }) {
  const navigate = useNavigate();
  const { data, recentRounds, trendView, setTrendView, goal } = vm;

  if (!data) return null;

  const openRound = (id: string) => navigate(`/rounds/${id}`);
  const openLab = () => navigate("/the-lab");
  const lastRound = recentRounds[0] ?? null;

  return (
    <div className="flex flex-col gap-3.5 pt-2">
      <GreetingHeader
        firstName={firstNameOf(vm.user)}
        dateLabel={greetingDateLabel()}
        handicapIndex={data.handicap_index}
        handicapChange={vm.handicapDelta}
        onHandicapClick={vm.openHandicapSheet}
      />

      <ScoringHeroCard
        average={vm.last20ScoringAvg}
        change={vm.scoringAverageChange}
        recentScores={vm.recentScores}
        mix={vm.l20ScoreMix}
        mixHoles={vm.mixHoleCount}
        bestRound={data.best_round ?? null}
        totalRounds={data.total_rounds}
        putts={vm.putts}
        girPct={vm.girPct}
      />

      {lastRound && (
        <RoundPreview variant="ticket" round={lastRound} onClick={() => openRound(lastRound.id)} />
      )}

      <GoalCard goal={goal} onOpen={openLab} />

      <Card>
        <CardHeader>
          <CardTitle>Score History</CardTitle>
          <CardAction>
            <ToggleGroup
              aria-label="Trend line"
              variant="outline"
              size="sm"
              spacing={0}
              value={[trendView]}
              onValueChange={(values) => {
                // Tapping the pressed item would empty the group; the card always shows one line.
                if (values[0] === "score" || values[0] === "handicap") setTrendView(values[0]);
              }}
            >
              <ToggleGroupItem value="score">Score</ToggleGroupItem>
              <ToggleGroupItem value="handicap">HCP</ToggleGroupItem>
            </ToggleGroup>
          </CardAction>
        </CardHeader>
        <CardContent>
          <SVGScoreHandicapTrend data={vm.trend} series={trendView} compact />
        </CardContent>
      </Card>

      <ShortGameCard scramblingPct={vm.scramblingPct} upAndDownPct={vm.upAndDownPct} onOpenLab={openLab} />

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-semibold text-foreground">Recent Rounds</h2>
          <Button variant="link" size="sm" nativeButton={false} render={<Link to="/rounds" />}>
            View all →
          </Button>
        </div>
        <Collection
          items={recentRounds}
          keyFor={(round) => round.id}
          empty="No rounds yet"
          renderItem={(round) => <RoundPreview round={round} onClick={() => openRound(round.id)} />}
        />
      </section>
    </div>
  );
}
