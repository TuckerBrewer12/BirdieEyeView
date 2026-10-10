import { useNavigate, Link } from "react-router-dom";
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
  Sparkline,
  Stat,
  StatDelta,
  StatLabel,
  StatValue,
} from "@/brand";
import { formatHandicapIndex } from "@/domain/handicap";
import { GirDonut } from "./components/GirDonut";
import { GoalCard } from "./components/GoalCard";
import { MilestoneFeed } from "./components/MilestoneFeed";
import { ProfileHeroBanner } from "./components/ProfileHeroBanner";
import { PuttsGauge } from "./components/PuttsGauge";
import { RecentRoundsTable } from "./components/RecentRoundsTable";
import { ScanActionCard } from "./components/ScanActionCard";
import { ScoreMixChart } from "./components/ScoreMixChart";
import type { DashboardPageViewModel } from "./useDashboardPageViewModel";
import { avgLabel, firstNameOf, pctLabel } from "./present";

export function DashboardDesktopLayout({ vm }: { vm: DashboardPageViewModel }) {
  const navigate = useNavigate();
  const {
    data, user, shortGameTrend,
    trend, milestones, last20ScoringAvg, hiTrend,
    recentDistribution, girPct, scramblingPct, upAndDownPct, putts,
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
                  <div className="flex items-center justify-between">
                    <Stat>
                      <StatLabel>Scoring Avg (L20)</StatLabel>
                      <StatValue size="lg">{avgLabel(last20ScoringAvg)}</StatValue>
                    </Stat>
                    <StatDelta direction={hiTrend} />
                  </div>
                  <Stat>
                    <StatLabel>Total Rounds</StatLabel>
                    <StatValue size="lg">{data.total_rounds}</StatValue>
                  </Stat>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-2">
              <CardHeader>
                <CardTitle>Score & Handicap Trend</CardTitle>
                <CardDescription>Last 20 rounds</CardDescription>
              </CardHeader>
              <CardContent>
                <SVGScoreHandicapTrend data={trend} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>GIR %</CardTitle>
                <CardDescription>Last 5 rounds</CardDescription>
              </CardHeader>
              <CardContent>
                <GirDonut pct={girPct} />
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
                  <Stat align="center">
                    <StatValue size="lg">{pctLabel(scramblingPct)}</StatValue>
                    <StatLabel>Scrambling</StatLabel>
                  </Stat>
                  <div className="w-px h-8 bg-muted" />
                  <Stat align="center">
                    <StatValue size="lg">{pctLabel(upAndDownPct)}</StatValue>
                    <StatLabel>Up & Down</StatLabel>
                  </Stat>
                </div>
                {shortGameTrend && (
                  <Sparkline
                    className="mt-3 px-1"
                    domain={[0, 100]}
                    series={[
                      { values: shortGameTrend.scrambling, label: "Scr" },
                      { values: shortGameTrend.upAndDown, tone: "contrast", label: "U&D" },
                    ]}
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
                <PuttsGauge putts={putts} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-1 overflow-hidden">
              <CardHeader>
                <CardTitle>Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <MilestoneFeed
                  milestones={milestones}
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

