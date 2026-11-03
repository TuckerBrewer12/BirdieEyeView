import { cn } from "@/brand/cn";
import { tokens } from "@/brand/theme";

interface RadarAxis {
  /** What the axis measures: "GIR", "Par 3s". */
  label: string;
  /** 0–100, further out being better. */
  value: number;
  /** The comparison on the same 0–100 scale. Leave it off every axis to draw the shape alone. */
  benchmark?: number | null;
  /** The figure under the label: "52%". Green when ahead of the comparison, red when behind, the shape's colour with none. */
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
 * centre, joined into a lightly filled outline. A comparison, when every axis has one, is
 * drawn as a dashed outline behind it, and each dot says whether the golfer is ahead of it.
 * Each spoke is labelled with its figures, so there is no tooltip.
 */
export function RadarChart({
  axes,
  empty = "Not enough data",
  compact = false,
  className,
  "aria-label": ariaLabel,
}: RadarChartProps) {
  const layout = compact ? { ...tokens.chart.radar, ...tokens.chart.radarCompact } : tokens.chart.radar;
  const { width: W, height: H, radius: R, labelGap, valueGap, rings, dot, stroke, benchmarkStroke, dash } = layout;
  const textSize = tokens.type["body-sm"].size;

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

  const compared = axes.every((axis) => axis.benchmark != null);
  // Ahead of the comparison reads green and behind it red; with none, the shape's own colour.
  const toneOf = (axis: RadarAxis) =>
    !compared
      ? tokens.color.primary
      : axis.value >= axis.benchmark!
        ? tokens.color.status.success.text
        : tokens.color.status.danger.text;

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
            points={outline(axes.map((axis) => axis.benchmark!))}
            fill="none"
            stroke={tokens.color.mutedForeground}
            strokeWidth={benchmarkStroke}
            strokeDasharray={`${dash} ${dash}`}
            strokeLinejoin="round"
          />
        )}

        <polygon
          points={outline(axes.map((axis) => axis.value))}
          fill={tokens.color.primary}
          fillOpacity={tokens.opacity.tint}
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
          // Two lines of text, each centred on its own y. On the vertical axis they sit clear
          // of the point (above it going up, below it going down); at the sides they straddle it.
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

interface RadarSummaryProps {
  /** The same axes the chart draws. Axes without a comparison count toward neither side. */
  axes: RadarAxis[];
  /** Who the shape is held up against, as it reads after "ahead of": "a 10 handicap". */
  against: string;
  /** The legend's name for the comparison. */
  benchmarkName?: string;
  /** How many of the biggest gaps to list. */
  gaps?: number;
  className?: string;
}

/**
 * What the radar adds up to, for the column beside it: how many areas are ahead of the
 * comparison, the biggest gaps where behind, and the legend for the two outlines.
 */
export function RadarSummary({ axes, against, benchmarkName = "Benchmark", gaps = 3, className }: RadarSummaryProps) {
  const compared = axes.filter((axis) => axis.benchmark != null);
  const ahead = compared.filter((axis) => axis.value >= axis.benchmark!).length;
  const behind = compared
    .filter((axis) => axis.value < axis.benchmark!)
    .sort((a, b) => a.value - a.benchmark! - (b.value - b.benchmark!))
    .slice(0, gaps);

  return (
    <div data-slot="radar-summary" className={cn("flex min-w-0 flex-col gap-3.5", className)}>
      <div>
        <div className="text-2xl leading-none font-bold tracking-tight">
          {ahead} <span className="text-base font-semibold text-muted-foreground">of {compared.length}</span>
        </div>
        <div className="mt-1 text-body-sm text-foreground-secondary">areas ahead of {against}</div>
      </div>
      {behind.length > 0 && (
        <>
          <div className="h-px bg-chart-grid" />
          <div className="flex flex-col gap-2">
            <div className="text-label font-bold tracking-wide text-muted-foreground uppercase">Biggest gaps</div>
            {behind.map((axis) => (
              <div key={axis.label} className="flex flex-wrap justify-between gap-x-2 text-body">
                <span>{axis.label}</span>
                <b className="whitespace-nowrap text-status-danger">
                  {axis.valueLabel} vs {axis.benchmarkLabel}
                </b>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="flex flex-col gap-1.5 text-label text-foreground-secondary">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 rounded-full bg-primary" />
          You
        </span>
        {compared.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="w-4 border-t-2 border-dashed border-muted-foreground" />
            {benchmarkName}
          </span>
        )}
      </div>
    </div>
  );
}

export type { RadarAxis, RadarChartProps, RadarSummaryProps };
