import { Card, ScoreMixBar, Stat, StatLabel, StatUnit, StatValue, ToParPill } from "@/brand";
import type { Round } from "@/domain";
import { summaryFigures } from "../roundDetailModel";

export function RoundSummaryCard({ round }: { round: Round }) {
  return (
    <Card
      data-slot="round-summary"
      className="grid grid-cols-round-summary-phone items-end gap-x-0 gap-y-3 px-4 py-3.5 md:grid-cols-round-summary md:items-stretch md:gap-0 md:p-0"
    >
      <Stat className="md:px-5 md:py-4">
        <StatLabel className="hidden text-body-sm md:block">Score</StatLabel>
        <div className="flex items-baseline gap-2">
          <StatValue size="card">{round.score ?? "—"}</StatValue>
          <ToParPill toPar={round.toPar} ground="muted" />
        </div>
      </Stat>
      {summaryFigures(round).map((figure) => (
        <Stat
          key={figure.label}
          align="center"
          className="flex-col-reverse md:flex-col md:items-start md:border-l md:border-border md:px-5 md:py-4 md:text-left"
        >
          <StatLabel tone="quiet" className="text-body-sm">
            {figure.label}
          </StatLabel>
          <StatValue size="summary">
            {figure.value}
            {figure.unit && <StatUnit>{figure.unit}</StatUnit>}
          </StatValue>
        </Stat>
      ))}
      <ScoreMixBar
        mix={round.scoreCounts}
        counted
        className="col-span-full justify-center md:col-span-1 md:border-l md:border-border md:px-5 md:py-4"
      />
    </Card>
  );
}
