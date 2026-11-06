import { cn } from "@/brand/cn";
import { chartTickStyle, tokens } from "@/brand/theme";

interface RadarAxis {
  /** What the axis measures: "GIR", "Par 3s". */
  label: string;
  /** 0–100, further out being better. */
  value: number;
  /** The comparison on the same 0–100 scale. Leave it off every axis to draw the shape alone. */
  benchmark?: number | null;
  /** The figure under the label, in the shape's colour: "52%". */
  valueLabel?: string;
  /** The comparison's figure, after "vs". */
  benchmarkLabel?: string;
}

interface RadarChartProps {
  /** Three or more axes, drawn clockwise from the top. */
  axes: RadarAxis[];
  /** Shown when there are fewer than three axes to draw. */
  empty?: string;
  /** A phone's width: a narrower drawing, so the labels scale down less. */
  compact?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * A shape across a handful of measures: one spoke each, the value plotted out from the
 * centre, joined into a filled outline. A comparison, when every axis has one, is drawn
 * dashed behind it. Each spoke is labelled with its figures, so there is no tooltip.
 */
export function RadarChart({
  axes,
  empty = "Not enough data",
  compact = false,
  className,
  "aria-label": ariaLabel,
}: RadarChartProps) {
  const layout = compact ? { ...tokens.chart.radar, ...tokens.chart.radarCompact } : tokens.chart.radar;
  const { width: W, height: H, radius: R, labelGap, valueGap, rings, dot, stroke } = layout;

  if (axes.length < 3) {
    return <div className="py-8 text-center text-sm text-muted-foreground">{empty}</div>;
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
            stroke={tokens.color.chart.muted}
            strokeWidth={tokens.lineWidth.border}
          />
        ))}
        {axes.map((axis, i) => {
          const [x, y] = point(i, 100);
          return <line key={axis.label} x1={cx} y1={cy} x2={x} y2={y} stroke={tokens.color.chart.muted} strokeWidth={tokens.lineWidth.border} />;
        })}

        {compared && (
          <g data-slot="radar-benchmark">
            <polygon
              points={outline(benchmarks)}
              fill={tokens.color.chart.axis}
              fillOpacity={tokens.opacity.wash}
              stroke={tokens.color.chart.axis}
              strokeWidth={stroke * 0.75}
              strokeDasharray={tokens.chart.guideDash}
            />
            {axes.map((axis, i) => {
              const [x, y] = point(i, benchmarks[i]);
              return <circle key={axis.label} cx={x} cy={y} r={dot * 0.75} fill={tokens.color.chart.axis} />;
            })}
          </g>
        )}

        <polygon
          points={outline(axes.map((axis) => axis.value))}
          fill={tokens.color.primary}
          fillOpacity={tokens.opacity.wash}
          stroke={tokens.color.primary}
          strokeWidth={stroke}
          strokeLinejoin="round"
        />
        {axes.map((axis, i) => {
          const [x, y] = point(i, axis.value);
          return <circle key={axis.label} cx={x} cy={y} r={dot} fill={tokens.color.primary} />;
        })}

        {axes.map((axis, i) => {
          const x = cx + (R + labelGap) * Math.cos(angle(i));
          const y = cy + (R + labelGap) * Math.sin(angle(i));
          const dx = x - cx;
          const anchor = Math.abs(dx) < 1 ? "middle" : dx > 0 ? "start" : "end";
          // Two lines of text: above the centre they end at the label point, below it they
          // start there, and level with it they straddle it.
          const dy = y - cy;
          const top = dy < -1 ? y - valueGap : dy > 1 ? y + valueGap / 2 : y - valueGap / 2 + valueGap / 4;
          return (
            <g key={axis.label}>
              <text
                x={x}
                y={top}
                textAnchor={anchor}
                fontSize={chartTickStyle.fontSize}
                fontWeight="600"
                fill={tokens.color.mutedForeground}
              >
                {axis.label}
              </text>
              {axis.valueLabel && (
                <text x={x} y={top + valueGap} textAnchor={anchor} fontSize={chartTickStyle.fontSize} fontWeight="700">
                  <tspan fill={tokens.color.primary}>{axis.valueLabel}</tspan>
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
