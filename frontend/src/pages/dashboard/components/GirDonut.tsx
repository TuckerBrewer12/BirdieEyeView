import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { colors } from "@/brand";

interface GirDonutProps {
  /** Greens in regulation, 0–100. Unknown draws an empty ring and a dash. */
  pct: number | null;
}

export function GirDonut({ pct }: GirDonutProps) {
  const hit = pct ?? 0;
  return (
    <div data-slot="gir-donut" className="relative h-chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={[{ value: hit }, { value: 100 - hit }]}
            dataKey="value"
            innerRadius={50}
            outerRadius={68}
            stroke="none"
            isAnimationActive={false}
            startAngle={90}
            endAngle={-270}
          >
            <Cell fill={colors.score.birdie.base} />
            <Cell fill={colors.muted} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-4xl font-semibold tracking-stat text-card-foreground">
          {pct != null ? `${pct.toFixed(0)}%` : "—"}
        </div>
        <div className="text-meta font-bold text-muted-foreground uppercase tracking-eyebrow">GIR</div>
      </div>
    </div>
  );
}
