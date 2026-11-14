import { cn } from "@/brand/cn";
import { EmptyNote } from "@/brand/components/EmptyNote";
import { tokens } from "@/brand/theme";

interface RadarAxis {
  label: string;
  value: number;
  benchmark?: number | null;
  verdict?: "ahead" | "even" | "behind" | null;
  valueLabel?: string;
  benchmarkLabel?: string;
}

interface RadarChartProps {
  axes: RadarAxis[];
  empty?: string;
  compact?: boolean;
  benchmarkTone?: "benchmark" | "friend";
  className?: string;
  "aria-label"?: string;
}

export function RadarChart({
  axes,
  empty = "Not enough data",
  compact = false,
  benchmarkTone = "benchmark",
  className,
  "aria-label": ariaLabel,
}: RadarChartProps) {
  const layout = compact ? { ...tokens.chart.radar, ...tokens.chart.radarCompact } : tokens.chart.radar;
  const { width: W, height: H, radius: R, labelGap, valueGap, rings, dot, stroke, strokeSecondary } = layout;
  const textSize = tokens.type["body-sm"].size;

  if (axes.length < 3) {
    return <EmptyNote>{empty}</EmptyNote>;
  }

  const cx = W / 2;
  const cy = H / 2;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
  const point = (i: number, percent: number) => {
    const r = (Math.max(0, Math.min(100, percent)) / 100) * R;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))] as const;
  };
  const outline = (values: number[]) => values.map((v, i) => point(i, v).join(",")).join(" ");

  const benchmarks = axes.flatMap((axis) => (axis.benchmark != null ? [axis.benchmark] : []));
  const compared = benchmarks.length === axes.length;
  const toneOf = (axis: RadarAxis) =>
    axis.verdict === "ahead"
      ? tokens.color.score.birdie.text
      : axis.verdict === "behind"
        ? tokens.color.score.bogey.text
        : tokens.color.primary;

  return (
    <div data-slot="radar-chart" className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-label={ariaLabel}
      >
        {rings.map((ring) => (
          <polygon
            key={ring}
            points={outline(axes.map(() => ring))}
            fill="none"
            stroke={ring === 100 ? tokens.color.border : tokens.color.chart.grid}
            strokeWidth={tokens.lineWidth.border}
          />
        ))}
        {axes.map((axis, i) => {
          const [x, y] = point(i, 100);
          return (
            <line
              key={axis.label}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke={tokens.color.chart.grid}
              strokeWidth={tokens.lineWidth.border}
            />
          );
        })}

        {compared && (
          <polygon
            data-slot="radar-benchmark"
            points={outline(benchmarks)}
            fill="none"
            stroke={benchmarkTone === "friend" ? tokens.color.chart.series2 : tokens.color.mutedForeground}
            strokeWidth={strokeSecondary}
            strokeDasharray={tokens.chart.guideDash}
            strokeLinejoin="round"
          />
        )}

        <polygon
          points={outline(axes.map((axis) => axis.value))}
          fill={tokens.color.primary}
          fillOpacity={tokens.opacity.faint}
          stroke={tokens.color.primary}
          strokeWidth={stroke}
          strokeLinejoin="round"
        />
        {axes.map((axis, i) => {
          const [x, y] = point(i, axis.value);
          return (
            <circle
              key={axis.label}
              cx={x}
              cy={y}
              r={dot}
              fill={toneOf(axis)}
              stroke={tokens.color.card}
              strokeWidth={tokens.lineWidth.outline}
            />
          );
        })}

        {axes.map((axis, i) => {
          const x = cx + (R + labelGap) * Math.cos(angle(i));
          const y = cy + (R + labelGap) * Math.sin(angle(i));
          const dx = x - cx;
          const dy = y - cy;
          const anchor = Math.abs(dx) < 1 ? "middle" : dx > 0 ? "start" : "end";
          const lead = Math.abs(dx) < 1 ? (dy < 0 ? y - valueGap * 1.5 : y + valueGap / 2) : y - valueGap / 2;
          return (
            <g key={axis.label} fontSize={textSize} dominantBaseline="central">
              <text x={x} y={lead} textAnchor={anchor} fontWeight="600" fill={tokens.color.foreground}>
                {axis.label}
              </text>
              {axis.valueLabel && (
                <text x={x} y={lead + valueGap} textAnchor={anchor}>
                  <tspan fontWeight="700" fill={toneOf(axis)}>
                    {axis.valueLabel}
                  </tspan>
                  {compared && axis.benchmarkLabel && (
                    <tspan fill={tokens.color.mutedForeground}> vs {axis.benchmarkLabel}</tspan>
                  )}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export type { RadarAxis, RadarChartProps };
