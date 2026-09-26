import { useNavigate, Link } from "react-router-dom";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  ActivityHeatmap,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  RoundPreview,
  SVGScoreHandicapTrend,
  colors,
} from "@/brand";
import { formatHandicapIndex, type HandicapTrend } from "@/domain/handicap";
import { GirDonut } from "./components/GirDonut";
import { GoalCard } from "./components/GoalCard";
import { MilestoneFeed } from "./components/MilestoneFeed";
import { ProfileHeroBanner } from "./components/ProfileHeroBanner";
import { PuttsGauge } from "./components/PuttsGauge";
import { RecentRoundsTable } from "./components/RecentRoundsTable";
import { ScanActionCard } from "./components/ScanActionCard";
import { ScoreMixChart } from "./components/ScoreMixChart";
import type { DashboardPageViewModel } from "./useDashboardPageViewModel";
import { avgLabel, dashboardPalette, firstNameOf, pctLabel, presentMilestones } from "./present";

function ShortGameSparkline({
  scrambling,
  upAndDown,
}: {
  scrambling: { round_index: number; scrambling_percentage: number }[];
  upAndDown: { round_index: number; percentage: number }[];
}) {
  const W = 200; const H = 44; const PAD = 4;
  const udMap = new Map(upAndDown.map((r) => [r.round_index, r.percentage]));
  const paired = scrambling.filter((r) => udMap.has(r.round_index)).slice(-12);
  if (paired.length < 2) return null;

  const xs = paired.map((_, i) => PAD + (i / (paired.length - 1)) * (W - PAD * 2));
  const toY = (v: number) => H - PAD - ((Math.max(0, Math.min(100, v)) / 100) * (H - PAD * 2));
  const scrPts = paired.map((r, i) => `${xs[i]},${toY(r.scrambling_percentage)}`).join(" ");
  const udPts = paired.map((r, i) => `${xs[i]},${toY(udMap.get(r.round_index)!)}`).join(" ");

  return (
    <div className="mt-3 px-1">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} overflow="visible">
        <polyline points={scrPts} fill="none" stroke={colors.primary} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.8} />
        <polyline points={udPts} fill="none" stroke={colors.score.triple.text} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.8} />
        <circle cx={xs[xs.length - 1]} cy={toY(paired[paired.length - 1].scrambling_percentage)} r={2.5} fill={colors.primary} />
        <circle cx={xs[xs.length - 1]} cy={toY(udMap.get(paired[paired.length - 1].round_index)!)} r={2.5} fill={colors.score.triple.text} />
      </svg>
      <div className="flex items-center gap-3 mt-1.5">
        <div className="flex items-center gap-1"><div className="size-2 rounded-full bg-primary" /><span className="text-caption text-muted-foreground">Scr</span></div>
        <div className="flex items-center gap-1"><div className="size-2 rounded-full bg-score-triple" /><span className="text-caption text-muted-foreground">U&D</span></div>
      </div>
    </div>
  );
}

function MiniKpi({ label, value, trend }: {
  label: string; value: string | number | null;
  trend?: HandicapTrend | null;
}) {
  const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "down" ? "text-score-birdie" : trend === "up" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-meta uppercase tracking-eyebrow text-muted-foreground font-bold">{label}</div>
        <div className="text-4xl font-semibold tracking-stat text-card-foreground leading-tight">{value ?? "—"}</div>
      </div>
      {trend && <Icon className={`size-4 ${trendColor}`} />}
    </div>
  );
}

export function DashboardDesktopLayout({ vm }: { vm: DashboardPageViewModel }) {
  const navigate = useNavigate();
  const {
    data, user, trends,
    dualData, recentMilestones, last20ScoringAvg, handicapTrend,
    recentDistribution, stats,
    bestRound, sidebarRounds, goal,
    openHandicapSheet,
  } = vm;

  if (!data) return null;

  return (
    <div className="pb-12">
      <div className="flex gap-6 max-w-7xl mx-auto items-start">

        {/* Left Main Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <ProfileHeroBanner
            user={user ?? null}
            handicapIndex={data.handicap_index}
            handicapLabel={formatHandicapIndex(data.handicap_index)}
            firstName={firstNameOf(user)}
            onHandicapClick={openHandicapSheet}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 auto-rows-min mt-6">

            <Card className="lg:col-span-3">
              <CardContent>
                <RoundPreview
                  round={bestRound}
                  variant="highlight"
                  onClick={bestRound ? () => navigate(`/rounds/${bestRound.id}`) : undefined}
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardContent>
                <div className="flex flex-col gap-5 h-full justify-between">
                  <MiniKpi label="Scoring Avg (L20)" value={avgLabel(last20ScoringAvg)} trend={handicapTrend} />
                  <MiniKpi label="Total Rounds" value={data.total_rounds} />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-2">
              <CardHeader>
                <CardTitle>Score & Handicap Trend</CardTitle>
                <CardDescription>Last 20 rounds</CardDescription>
              </CardHeader>
              <CardContent>
                <SVGScoreHandicapTrend
                  data={dualData}
                  scoreColor={dashboardPalette.scoreLineColor}
                  handicapColor={dashboardPalette.handicapLineColor}
                  gridColor={dashboardPalette.gridColor}
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>GIR %</CardTitle>
                <CardDescription>Last 5 rounds</CardDescription>
              </CardHeader>
              <CardContent>
                <GirDonut pct={stats.girPct} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-1 overflow-hidden">
              <CardHeader>
                <CardTitle>Score Mix</CardTitle>
                <CardDescription>Last 5 rounds · % of holes</CardDescription>
              </CardHeader>
              <CardContent>
                <ScoreMixChart mix={recentDistribution} />
              </CardContent>
            </Card>

            <Card size="sm" className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Short Game</CardTitle>
                <CardDescription>Last 5 rounds</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-around mt-6">
                  <div className="text-center">
                    <div className="text-4xl font-semibold text-card-foreground tracking-stat">
                      {pctLabel(stats.scramblingPct)}
                    </div>
                    <div className="text-meta font-bold text-muted-foreground uppercase tracking-eyebrow mt-0.5">Scrambling</div>
                  </div>
                  <div className="w-px h-8 bg-muted" />
                  <div className="text-center">
                    <div className="text-4xl font-semibold text-card-foreground tracking-stat">
                      {pctLabel(stats.upAndDownPct)}
                    </div>
                    <div className="text-meta font-bold text-muted-foreground uppercase tracking-eyebrow mt-0.5">Up & Down</div>
                  </div>
                </div>
                {trends && (
                  <ShortGameSparkline
                    scrambling={trends.scrambling_trend}
                    upAndDown={trends.up_and_down_trend}
                  />
                )}
              </CardContent>
            </Card>

            <Card size="sm" className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Avg Putts</CardTitle>
                <CardDescription>Last 5 rounds</CardDescription>
              </CardHeader>
              <CardContent>
                <PuttsGauge putts={stats.putts} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-1 overflow-hidden">
              <CardHeader>
                <CardTitle>Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <MilestoneFeed
                  milestones={presentMilestones(recentMilestones)}
                  onRoundClick={(id) => navigate(`/rounds/${id}`)}
                />
              </CardContent>
            </Card>

            <GoalCard className="lg:col-span-1" goal={goal} onOpen={() => navigate("/the-lab")} />

            <div className="lg:col-span-3 flex justify-end gap-3 mt-4 lg:hidden">
              <Button nativeButton={false} render={<Link to="/rounds" />}>
                All Rounds
              </Button>
              <Button variant="outline" nativeButton={false} render={<Link to="/courses" />}>
                Browse Courses
              </Button>
            </div>

          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-72 shrink-0 hidden xl:flex flex-col gap-6 sticky top-20 self-start">
          <ScanActionCard onClick={() => navigate("/scan")} />

          <Card size="sm">
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityHeatmap rounds={vm.rounds} />
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Recent Rounds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto -mx-1">
                <RecentRoundsTable
                  rounds={sidebarRounds}
                  onRoundClick={(id) => navigate(`/rounds/${id}`)}
                />
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  nativeButton={false}
                  render={<Link to="/rounds" />}
                >
                  View All Round History
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

