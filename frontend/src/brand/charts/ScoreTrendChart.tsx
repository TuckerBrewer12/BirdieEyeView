import { useId, useState, type MouseEvent } from "react";
import { scaleLinear } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { ToParFigure } from "@/brand/components/ToParFigure";
import { chartColors, chartLayout, chartTickStyle, colors, toParFill } from "@/brand/theme";
import { formatRoundDateHistory, formatRoundDateTick } from "@/lib/roundDate";
import type { CourseScoreTrendRowDto } from "@/types/api";

interface ScoreTrendChartProps {
  /** The server's trend rows, oldest first. Unscored rounds are left out. */
  rows: CourseScoreTrendRowDto[];
}

type ScoredRow = CourseScoreTrendRowDto & { total_score: number };

/**
 * A golfer's scores over time: one dot per round, coloured by its score to par,
 * joined into a line over a soft fill. Hovering a dot shows its date and score.
 */
export function ScoreTrendChart({ rows }: ScoreTrendChartProps) {
  const { width: W, height: H, pad: PAD, headroom, dot, dotHover, maxTicks } = chartLayout.trend;
  const [hovered, setHovered] = useState<ScoredRow | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const areaId = `score-trend-area-${useId().replace(/:/g, "")}`;

  const data = rows.filter((row): row is ScoredRow => row.total_score != null);
  if (data.length < 2) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Not enough data</div>;
  }

  const scores = data.map((row) => row.total_score);
  const x = scaleLinear().domain([0, data.length - 1]).range([PAD.left, W - PAD.right]);
  const y = scaleLinear()
    .domain([Math.min(...scores) - headroom, Math.max(...scores) + headroom])
    .range([H - PAD.bottom, PAD.top]);
  const linePath = line<ScoredRow>().x((_, i) => x(i)).y((row) => y(row.total_score)).curve(curveMonotoneX)(data) ?? "";
  const areaPath =
    area<ScoredRow>()
      .x((_, i) => x(i))
      .y0(H - PAD.bottom)
      .y1((row) => y(row.total_score))
      .curve(curveMonotoneX)(data) ?? "";
  const gridTicks = y.ticks(5);
  const hoveredIndex = hovered ? data.indexOf(hovered) : -1;

  const handleMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = Math.round(x.invert((event.clientX - rect.left) * (W / rect.width)));
    setHovered(data[Math.max(0, Math.min(data.length - 1, index))]);
    setTooltipPos({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  return (
    <div data-slot="score-trend-chart" className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors.primary} stopOpacity={0.12} />
            <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        {gridTicks.map((tick) => (
          <line
            key={tick}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(tick)}
            y2={y(tick)}
            stroke={chartColors.muted}
            strokeWidth={1}
          />
        ))}
        {gridTicks.map((tick) => (
          <text
            key={`label-${tick}`}
            x={PAD.left - 6}
            y={y(tick) + 4}
            textAnchor="end"
            fontSize={chartTickStyle.fontSize}
            fill={chartColors.axis}
          >
            {tick}
          </text>
        ))}
        <path d={areaPath} fill={`url(#${areaId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={colors.primary}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((row, i) => (
          <circle
            key={row.round_index}
            cx={x(i)}
            cy={y(row.total_score)}
            r={hovered === row ? dotHover : dot}
            fill={toParFill(row.to_par)}
            stroke={colors.card}
            strokeWidth={1.5}
          />
        ))}
        {hovered && (
          <line
            x1={x(hoveredIndex)}
            x2={x(hoveredIndex)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke={chartColors.muted}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}
        {data.length <= maxTicks &&
          data.map((row, i) => {
            const tick = formatRoundDateTick(row.date);
            return tick ? (
              <text
                key={`tick-${row.round_index}`}
                x={x(i)}
                y={H - PAD.bottom + 14}
                textAnchor="middle"
                fontSize={chartTickStyle.fontSize}
                fill={chartColors.axis}
              >
                {tick}
              </text>
            ) : null;
          })}
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 min-w-28 rounded-xl border border-border bg-card px-3 py-2.5 text-xs shadow-card"
          style={{
            left: tooltipPos.x + (tooltipPos.x > W * 0.68 ? -145 : 14),
            top: tooltipPos.y - 10,
          }}
        >
          <div className="mb-1 text-meta text-muted-foreground">{formatRoundDateHistory(hovered.date) ?? "—"}</div>
          <div className="text-sm font-bold text-foreground">{hovered.total_score}</div>
          <ToParFigure toPar={hovered.to_par} />
        </div>
      )}
    </div>
  );
}
