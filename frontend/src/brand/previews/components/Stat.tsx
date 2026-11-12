import { Stat, StatCard, StatDelta, StatLabel, StatUnit, StatValue } from "@/brand/components/Stat";
import { formatOneDecimal } from "@/domain";
import { labAnalytics } from "@/testing/fixtures/lab";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";

const golfer = sampleGolfer.analytics;
const dashboard = sampleGolfer.dashboard;
const scores = (rows: { total_score: number | null }[]) => rows.map((row) => row.total_score);
/** How far a scoring average moved, unsigned, as its tile shows it. */
const moved = (change: number | null | undefined) => formatOneDecimal(change != null ? Math.abs(change) : null);
const golferTone = golfer.kpis.scoring_average_verdict ?? "neutral";
const labTone = labAnalytics.kpis.scoring_average_verdict ?? "neutral";
const dashboardTone = dashboard.scoring_average_verdict ?? "neutral";

export default function StatPreview() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Scoring Avg"
          value={String(golfer.kpis.scoring_average)}
          trend={scores(golfer.score_trend)}
          delta={moved(golfer.kpis.scoring_average_change)}
          direction="down"
          tone={golferTone}
          note="last 5 vs all"
        />
        <StatCard
          label="Scoring Avg"
          value={String(labAnalytics.kpis.scoring_average)}
          trend={scores(labAnalytics.score_trend)}
          delta={moved(labAnalytics.kpis.scoring_average_change)}
          direction="up"
          tone={labTone}
          note="last 5 vs all"
        />
        <StatCard label="Best Round" value={String(dashboard.best_round)} note={dashboard.best_round_course} />
        <StatCard label="Rounds" value={String(golfer.kpis.total_rounds)} />
      </div>

      <div className="flex items-end justify-between">
        <Stat>
          <StatLabel>Scoring avg · L20</StatLabel>
          <StatValue size="xl">{dashboard.scoring_average_l5}</StatValue>
        </Stat>
        <StatDelta direction="down" tone={dashboardTone} pill>
          {moved(dashboard.scoring_average_change)} vs L5
        </StatDelta>
      </div>

      <div className="flex items-center justify-between">
        <Stat>
          <StatLabel>Handicap</StatLabel>
          <StatValue size="lg">
            {golfer.kpis.handicap_index}
            <StatUnit>HCP</StatUnit>
          </StatValue>
        </Stat>
        <StatDelta direction="up" tone="bad" />
      </div>

      <div className="flex justify-around">
        <Stat align="center">
          <StatValue size="lg">38%</StatValue>
          <StatLabel>Scrambling</StatLabel>
        </Stat>
        <Stat align="center">
          <StatValue size="lg">—</StatValue>
          <StatLabel>Up &amp; Down</StatLabel>
        </Stat>
      </div>

      <div className="grid grid-cols-4">
        {[
          ["Best", "69"],
          ["Rounds", "4"],
          ["Putts", "32.0"],
          ["GIR", "39%"],
        ].map(([label, value]) => (
          <Stat key={label} align="center">
            <StatLabel>{label}</StatLabel>
            <StatValue size="sm">{value}</StatValue>
          </Stat>
        ))}
      </div>

      {/* Round detail's summary: the score, then figures that shrink on a phone. */}
      <div className="flex items-end gap-6">
        <Stat>
          <StatLabel>Score</StatLabel>
          <StatValue size="card">78</StatValue>
        </Stat>
        <Stat>
          <StatLabel tone="quiet">Greens</StatLabel>
          <StatValue size="summary">
            7<StatUnit>/18</StatUnit>
          </StatValue>
        </Stat>
        <Stat>
          <StatLabel tone="quiet">Index</StatLabel>
          <StatValue size="hero">12.4</StatValue>
        </Stat>
      </div>

      <div className="flex items-end gap-6">
        <Stat>
          <StatLabel>Up &amp; Down</StatLabel>
          <StatValue>
            33<StatUnit>%</StatUnit>
          </StatValue>
        </Stat>
        <StatDelta direction="flat" tone="neutral">
          0.0
        </StatDelta>
        <StatDelta direction={null} tone="neutral">
          hidden
        </StatDelta>
      </div>
    </div>
  );
}
