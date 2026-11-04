import { Stat, StatCard, StatDelta, StatLabel, StatUnit, StatValue } from "@/brand/components/Stat";
import { labAnalytics } from "@/testing/fixtures/lab";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";

const golfer = sampleGolfer.analytics;
const dashboard = sampleGolfer.dashboard;
const scores = (rows: { total_score: number | null }[]) => rows.map((row) => row.total_score);

export default function StatPreview() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Scoring Avg"
          value={String(golfer.kpis.scoring_average)}
          trend={scores(golfer.score_trend)}
          delta={Math.abs(golfer.kpis.scoring_average_change!).toFixed(1)}
          direction="down"
          tone={golfer.kpis.scoring_average_verdict!}
          note="last 5 vs all"
        />
        <StatCard
          label="Scoring Avg"
          value={String(labAnalytics.kpis.scoring_average)}
          trend={scores(labAnalytics.score_trend)}
          delta={Math.abs(labAnalytics.kpis.scoring_average_change!).toFixed(1)}
          direction="up"
          tone={labAnalytics.kpis.scoring_average_verdict!}
          note="last 5 vs all"
        />
        <StatCard label="Best Round" value={String(dashboard.best_round)} note={dashboard.best_round_course} />
        <StatCard label="Rounds" value={String(golfer.kpis.total_rounds)} />
      </div>

      <div className="flex items-end justify-between">
        <Stat>
          <StatLabel>Scoring avg · L20</StatLabel>
          <StatValue size="xl">{dashboard.scoring_average_l20}</StatValue>
        </Stat>
        <StatDelta direction="down" tone={dashboard.scoring_average_verdict!} pill>
          {Math.abs(dashboard.scoring_average_change!).toFixed(1)} vs L5
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
