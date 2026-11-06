import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { tokens } from "@/brand";
import { formatPercent } from "@/domain";

interface GirDonutProps {
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
            innerRadius={tokens.chart.ring.inner}
            outerRadius={tokens.chart.ring.outer}
            stroke="none"
            isAnimationActive={false}
            startAngle={90}
            endAngle={-270}
          >
            <Cell fill={tokens.color.score.birdie.base} />
            <Cell fill={tokens.color.muted} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-4xl font-semibold tracking-stat text-card-foreground">
          {formatPercent(pct)}
        </div>
        <div className="text-eyebrow text-muted-foreground uppercase">GIR</div>
      </div>
    </div>
  );
}
