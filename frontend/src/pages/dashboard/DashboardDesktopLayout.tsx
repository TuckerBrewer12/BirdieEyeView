import { useNavigate, Link } from "react-router-dom";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
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
  chartColors,
  chartLayout,
  chartTickStyle,
  chartTooltipStyle,
  colors,
} from "@/brand";
import { formatHandicapIndex } from "@/domain/handicap";
import { MilestoneFeed } from "./components/MilestoneFeed";
import { ProfileHeroBanner } from "./components/ProfileHeroBanner";
import { RecentRoundsTable } from "./components/RecentRoundsTable";
import { ScanActionCard } from "./components/ScanActionCard";
import type { DashboardPageViewModel } from "./useDashboardPageViewModel";
import {
  avgLabel,
  colorizeMix,
  dashboardPalette,
  firstNameOf,
  girDonutData,
  goalAverageLabel,
  goalNumberLabel,
  goalTargetLabel,
  pctLabel,
  puttsColor,
  puttsGaugeData,
  puttsLabel,
} from "./present";

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
  trend?: "up" | "down" | "flat" | null;
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
  const palette = dashboardPalette;
  const {
    data, user, goalReport, trends,
    dualData, recentMilestones, last20ScoringAvg, hiTrend,
    girPct, recentDistribution, scramblingPct,
    upAndDownPct, putts,
    bestRound, sidebarRounds,
    scoringGoal, goalBarPct, goalOnTrack,
    openHandicapSheet,
  } = vm;

  if (!data) return null;

  const last20ScoringAvgLabel = avgLabel(last20ScoringAvg);
  const girPctLabel = pctLabel(girPct);
  const girDonut = girDonutData(girPct);
  const coloredDistribution = colorizeMix(recentDistribution);
  const scramblingPctLabel = pctLabel(scramblingPct);
  const upAndDownPctLabel = pctLabel(upAndDownPct);
  const puttsText = puttsLabel(putts);
  const puttsGauge = puttsGaugeData(putts);
  const puttsFill = puttsColor(putts, palette);
  const handicapIndexLabel = formatHandicapIndex(data.handicap_index);
  const firstName = firstNameOf(user);
  const hasScoringGoal = scoringGoal != null;
  const targetLabel = goalTargetLabel(scoringGoal);
  const numberLabel = goalNumberLabel(scoringGoal);
  const averageLabel = goalAverageLabel(goalReport);
  const goalFocusHeadline = goalReport?.savers[0]?.headline ?? null;
  const {
    scoreLineColor, handicapLineColor, gridColor, girColor, warningColor, dangerColor, mutedFill,
  } = palette;

  return (
    <div className="pb-12">
      <div className="flex gap-6 max-w-7xl mx-auto items-start">

        {/* Left Main Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <ProfileHeroBanner
            user={user ?? null}
            handicapIndex={data.handicap_index}
            handicapLabel={handicapIndexLabel}
            firstName={firstName}
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
                  <MiniKpi label="Scoring Avg (L20)" value={last20ScoringAvgLabel} trend={hiTrend} />
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
                  scoreColor={scoreLineColor}
                  handicapColor={handicapLineColor}
                  gridColor={gridColor}
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>GIR %</CardTitle>
                <CardDescription>Last 5 rounds</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative h-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={girDonut} dataKey="value"
                        innerRadius={50} outerRadius={68} stroke="none"
                        startAngle={90} endAngle={-270}>
                        <Cell fill={girColor} />
                        <Cell fill={mutedFill} />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-4xl font-semibold tracking-stat text-card-foreground">{girPctLabel}</div>
                    <div className="text-meta font-bold text-muted-foreground uppercase tracking-eyebrow">GIR</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1 overflow-hidden">
              <CardHeader>
                <CardTitle>Score Mix</CardTitle>
                <CardDescription>Last 5 rounds · % of holes</CardDescription>
              </CardHeader>
              <CardContent>
                {coloredDistribution.length > 0 ? (
                  <div className="h-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={coloredDistribution} margin={chartLayout.margin}>
                      <CartesianGrid stroke={gridColor} vertical={false} />
                      <XAxis dataKey="label" tick={{ ...chartTickStyle, fill: chartColors.axis, fontWeight: 700 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ ...chartTickStyle, fill: chartColors.axis, fontWeight: 700 }} tickLine={false} axisLine={false} unit="%" />
                      <Tooltip contentStyle={chartTooltipStyle}
                        formatter={(value: number | string | ReadonlyArray<number | string> | undefined) => {
                          const base = Array.isArray(value) ? value[0] : value;
                          const n = typeof base === "number" ? base : Number(base);
                          return [Number.isFinite(n) ? `${n.toFixed(1)}%` : `${String(base ?? "")}%`, ""];
                        }}
                      />
                      <Bar dataKey="value" radius={chartLayout.barRadius} maxBarSize={28}>
                        {coloredDistribution.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-8">No data yet</div>
                )}
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
                      {scramblingPctLabel}
                    </div>
                    <div className="text-meta font-bold text-muted-foreground uppercase tracking-eyebrow mt-0.5">Scrambling</div>
                  </div>
                  <div className="w-px h-8 bg-muted" />
                  <div className="text-center">
                    <div className="text-4xl font-semibold text-card-foreground tracking-stat">
                      {upAndDownPctLabel}
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
                <div className="mx-auto w-full max-w-xs">
                  <div className="relative h-30">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={puttsGauge} cx="50%" cy="100%"
                          startAngle={180} endAngle={0}
                          innerRadius={52} outerRadius={72}
                          dataKey="value" stroke="none">
                          <Cell fill={puttsFill} />
                          <Cell fill={mutedFill} />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pointer-events-none">
                      <div className="text-2xl font-bold text-card-foreground">{puttsText}</div>
                      <div className="text-caption text-muted-foreground uppercase tracking-kicker">Putts</div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-3 text-caption text-muted-foreground font-semibold uppercase tracking-kicker mt-2">
                  <span style={{ color: girColor }}>{"<30 great"}</span>
                  <span style={{ color: warningColor }}>30-35</span>
                  <span style={{ color: dangerColor }}>35+ work</span>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1 overflow-hidden">
              <CardHeader>
                <CardTitle>Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <MilestoneFeed
                  milestones={recentMilestones}
                  onRoundClick={(id) => navigate(`/rounds/${id}`)}
                />
              </CardContent>
            </Card>

            <Card
              className="lg:col-span-1 cursor-pointer"
              size="sm"
              onClick={() => navigate("/the-lab")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate("/the-lab");
                }
              }}
            >
              <CardContent>
              {hasScoringGoal && goalReport ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-meta font-bold uppercase tracking-eyebrow text-muted-foreground mb-0.5">Scoring Goal</div>
                      <div className="text-sm font-bold text-card-foreground">
                        Target: {targetLabel}
                      </div>
                    </div>
                    <span className="text-label font-semibold text-primary">Goals →</span>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-meta text-muted-foreground mb-1">
                      <span>{averageLabel}</span>
                      <span>Goal {numberLabel}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${goalBarPct}%`,
                          background: goalOnTrack ? colors.score.birdie.base : `linear-gradient(90deg, ${colors.primary}, ${chartColors.axis})`,
                        }}
                      />
                    </div>
                  </div>
                  {goalFocusHeadline && (
                    <p className="text-label text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-secondary-foreground">Focus: </span>
                      {goalFocusHeadline}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-start justify-center h-full gap-2">
                  <div className="text-meta font-bold uppercase tracking-eyebrow text-muted-foreground">Scoring Goal</div>
                  <p className="text-sm text-muted-foreground">Set a scoring goal to track your progress.</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/the-lab");
                    }}
                  >
                    Set a goal →
                  </Button>
                </div>
              )}
              </CardContent>
            </Card>

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
              <ActivityHeatmap rounds={data.recent_rounds} />
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

