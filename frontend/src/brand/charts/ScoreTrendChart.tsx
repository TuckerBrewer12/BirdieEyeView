import { useId, useState, type MouseEvent } from "react";
import { scaleLinear } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { ToParFigure } from "@/brand/components/ToParFigure";
import { chartTickStyle, toParFill, tokens } from "@/brand/theme";
import { formatDay, formatDayTick } from "@/domain/date";
import type { ScorePoint } from "@/domain/courseAnalytics";
import { indexScale, paddedExtent } from "./scales";

interface ScoreTrendChartProps {
  /** The rounds, oldest first. Unscored rounds are left out. */
  rows: ScorePoint[];
}

type ScoredRow = ScorePoint & { score: number };

/**
 * A golfer's scores over time: one dot per round, coloured by its score to par,
 * joined into a line over a soft fill. Hovering a dot shows its date and score.
 */
export function ScoreTrendChart({ rows }: ScoreTrendChartProps) {
  const { width: W, height: H, pad: PAD, headroom, stroke, dot, dotHover, maxTicks } = tokens.chart.trend;
  const [hovered, setHovered] = useState<ScoredRow | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const areaId = `score-trend-area-${useId().replace(/:/g, "")}`;

  const data = rows.filter((row): row is ScoredRow => row.score != null);
  if (data.length < 2) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Not enough data</div>;
  }

  const x = indexScale(data.length, PAD.left, W - PAD.right);
  const y = scaleLinear()
    .domain(paddedExtent(data.map((row) => row.score), headroom)!)
    .range([H - PAD.bottom, PAD.top]);
  const linePath = line<ScoredRow>().x((_, i) => x(i)).y((row) => y(row.score)).curve(curveMonotoneX)(data) ?? "";
  const areaPath =
    area<ScoredRow>()
      .x((_, i) => x(i))
      .y0(H - PAD.bottom)
      .y1((row) => y(row.score))
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
            <stop offset="5%" stopColor={tokens.color.primary} stopOpacity={tokens.opacity.haze} />
            <stop offset="95%" stopColor={tokens.color.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        {gridTicks.map((tick) => (
          <line
            key={tick}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(tick)}
            y2={y(tick)}
            stroke={tokens.color.chart.muted}
            strokeWidth={tokens.lineWidth.border}
          />
        ))}
        {gridTicks.map((tick) => (
          <text
            key={`label-${tick}`}
            x={PAD.left - 6}
            y={y(tick) + 4}
            textAnchor="end"
            fontSize={chartTickStyle.fontSize}
            fill={tokens.color.chart.axis}
          >
            {tick}
          </text>
        ))}
        <path d={areaPath} fill={`url(#${areaId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={tokens.color.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((row, i) => (
          <circle
            key={row.roundIndex}
            cx={x(i)}
            cy={y(row.score)}
            r={hovered === row ? dotHover : dot}
            fill={toParFill(row.toPar)}
            stroke={tokens.color.card}
            strokeWidth={tokens.lineWidth.outline}
          />
        ))}
        {hovered && (
          <line
            x1={x(hoveredIndex)}
            x2={x(hoveredIndex)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke={tokens.color.chart.muted}
            strokeWidth={tokens.lineWidth.border}
            strokeDasharray={`${tokens.space.dot} ${tokens.space.dot}`}
          />
        )}
        {data.length <= maxTicks &&
          data.map((row, i) => {
            const tick = formatDayTick(row.date);
            return tick ? (
              <text
                key={`tick-${row.roundIndex}`}
                x={x(i)}
                y={H - PAD.bottom + 14}
                textAnchor="middle"
                fontSize={chartTickStyle.fontSize}
                fill={tokens.color.chart.axis}
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
          <div className="mb-1 text-meta text-muted-foreground">{formatDay(hovered.date) ?? "—"}</div>
          <div className="text-sm font-bold text-foreground">{hovered.score}</div>
          <ToParFigure toPar={hovered.toPar} />
        </div>
      )}
    </div>
  );
}
