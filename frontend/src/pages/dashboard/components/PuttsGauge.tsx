import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { tokens } from "@/brand";
import type { PuttsRating } from "../model";
import { puttsLabel } from "../present";

const RATING_FILL: Record<PuttsRating, string> = {
  strong: tokens.color.score.birdie.base,
  fair: tokens.color.score.eagle.base,
  weak: tokens.color.destructive,
};

interface PuttsGaugeProps {
  /** Putts per 18 holes. Unknown draws an empty gauge and a dash. */
  putts: number | null;
  /** The server's rating of them, which colours the gauge. */
  rating: PuttsRating | null;
}

/** A half gauge from 20 to 40 putts, filled in the colour of the server's rating. */
export function PuttsGauge({ putts, rating }: PuttsGaugeProps) {
  const filled = putts != null ? Math.max(20, Math.min(40, putts)) - 20 : 0;
  return (
    <div data-slot="putts-gauge">
      <div className="mx-auto w-full max-w-xs">
        <div className="relative h-30">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[{ value: filled }, { value: 20 }]}
                cx="50%"
                cy="100%"
                startAngle={180}
                endAngle={0}
                innerRadius={tokens.chart.gauge.inner}
                outerRadius={tokens.chart.gauge.outer}
                dataKey="value"
                stroke="none"
                isAnimationActive={false}
              >
                <Cell fill={rating ? RATING_FILL[rating] : tokens.color.muted} />
                <Cell fill={tokens.color.muted} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pointer-events-none">
            <div className="text-2xl font-bold text-card-foreground">
              {puttsLabel(putts)}
            </div>
            <div className="text-caption text-muted-foreground uppercase tracking-kicker">Putts</div>
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-3 text-kicker text-muted-foreground font-semibold uppercase mt-2">
        <span className="text-score-birdie-base">{"≤30 great"}</span>
        <span className="text-score-eagle-base">30-34</span>
        <span className="text-destructive">34+ work</span>
      </div>
    </div>
  );
}
