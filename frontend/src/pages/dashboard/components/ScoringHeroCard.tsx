import {
  Card,
  CardContent,
  ScoreMixBar,
  Sparkline,
  Stat,
  StatDelta,
  StatLabel,
  StatValue,
} from "@/brand";
import type { ScoreMix } from "@/domain";
import { avgLabel, pctLabel, puttsLabel } from "../present";

interface ScoringHeroCardProps {
  /** Scoring average over the last 20 rounds. */
  average: number | null;
  /** The L20 average minus the L5 average: positive means the recent rounds came in lower. */
  change: number | null;
  /** Scores across the window, oldest first. */
  recentScores: number[];
  /** Null until the window has a scored hole. */
  mix: ScoreMix | null;
  mixHoles: number;
  bestRound: number | null;
  totalRounds: number | null;
  putts: number | null;
  girPct: number | null;
}

/** The mobile dashboard's lead card: the scoring average, where it's heading, and how the holes went. */
export function ScoringHeroCard({
  average,
  change,
  recentScores,
  mix,
  mixHoles,
  bestRound,
  totalRounds,
  putts,
  girPct,
}: ScoringHeroCardProps) {
  // Under a tenth of a stroke is noise, so the pill stays hidden.
  const showChange = change != null && Math.abs(change) >= 0.1;
  const kpis = [
    { label: "Best", value: bestRound?.toString() ?? "—" },
    { label: "Rounds", value: totalRounds?.toString() ?? "—" },
    { label: "Putts", value: puttsLabel(putts) },
    { label: "GIR", value: pctLabel(girPct) },
  ];

  return (
    <Card
      data-slot="scoring-hero-card"
      className="rounded-2xl bg-radial-[at_90%_10%] from-primary/8 to-card to-55%"
    >
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <StatLabel>Scoring Avg · L20</StatLabel>
          {showChange && (
            <StatDelta
              direction={change > 0 ? "down" : "up"}
              className="rounded-full px-2 py-0.5 data-[direction=down]:bg-score-birdie/10 data-[direction=up]:bg-score-bogey/10"
            >
              {Math.abs(change).toFixed(1)} vs L5
            </StatDelta>
          )}
        </div>

        <div className="grid grid-cols-[auto_1fr] items-center gap-3.5">
          <StatValue size="xl">{avgLabel(average)}</StatValue>
          <Sparkline series={[{ values: recentScores }]} fill mean />
        </div>

        {mix && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <StatLabel>Score Mix · L20</StatLabel>
              {mixHoles > 0 && <span className="text-meta text-muted-foreground">{mixHoles} holes</span>}
            </div>
            <ScoreMixBar mix={mix} />
          </div>
        )}

        <div className="grid grid-cols-4 border-t border-border pt-3">
          {kpis.map(({ label, value }) => (
            <Stat key={label} align="center">
              <StatLabel>{label}</StatLabel>
              <StatValue size="sm">{value}</StatValue>
            </Stat>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
