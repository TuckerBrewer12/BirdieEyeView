import { Card, ScoreMixBar, ToParPill } from "@/brand";
import type { Round } from "@/domain";

interface SummaryFigure {
  label: string;
  value: string;
  /** Read beside the value, smaller: "/18" after the greens hit. */
  unit?: string;
}

/**
 * The round at a glance: the score and its to-par, net, putts and greens, then the score mix with its
 * counts. One card in five columns on a wide screen; on a phone the figures sit in a row over the mix.
 * Every figure is the server's.
 */
export function RoundSummaryCard({ round }: { round: Round }) {
  const figures: SummaryFigure[] = [
    { label: "Net", value: round.netScore?.toString() ?? "—" },
    { label: "Putts", value: round.putts?.toString() ?? "—" },
    {
      label: "Greens",
      value: round.gir?.toString() ?? "—",
      unit: round.gir != null ? `/${round.holesPlayed}` : undefined,
    },
  ];

  return (
    <Card
      data-slot="round-summary"
      className="grid grid-cols-round-summary-phone items-end gap-x-0 gap-y-3 px-4 py-3.5 md:grid-cols-round-summary md:items-stretch md:gap-0 md:p-0"
    >
      <div className="flex flex-col md:px-5 md:py-4">
        <span className="hidden text-body-sm font-medium text-foreground-secondary md:block">Score</span>
        <div className="flex items-baseline gap-2">
          <span className="text-figure leading-none text-foreground md:leading-tight">{round.score ?? "—"}</span>
          <ToParPill toPar={round.toPar} ground="muted" />
        </div>
      </div>
      {figures.map((figure) => (
        <div
          key={figure.label}
          className="flex flex-col-reverse items-center md:flex-col md:items-start md:border-l md:border-border md:px-5 md:py-4"
        >
          <span className="text-label text-muted-foreground md:text-body-sm md:font-medium md:text-foreground-secondary">
            {figure.label}
          </span>
          <span className="text-lg font-semibold text-foreground md:text-title md:font-semibold">
            {figure.value}
            {figure.unit && <span className="md:text-body-lg md:text-muted-foreground">{figure.unit}</span>}
          </span>
        </div>
      ))}
      <ScoreMixBar
        mix={round.scoreCounts}
        counted
        className="col-span-full justify-center md:col-span-1 md:border-l md:border-border md:px-5 md:py-4"
      />
    </Card>
  );
}
