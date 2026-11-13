import type { ReactNode } from "react";
import { scaleLinear } from "d3-scale";
import { curveStepAfter, line } from "d3-shape";
import { cn } from "@/brand/cn";
import { tokens } from "@/brand/theme";
import { formatHandicapIndex, type RoundTrendPoint } from "@/domain";
import { ChartTooltip } from "./ChartTooltip";
import { indexScale, knownValues, lastKnownIndex, niceExtent } from "./scales";
import { usePointPick } from "./usePointPick";

interface HandicapTrendChartProps {
  data: RoundTrendPoint[];
  /** The phone shape: narrower. */
  compact?: boolean;
}

const L = tokens.chart.handicapTrend;

/**
 * The handicap index after each round, as a step line, with its latest figure written by the
 * last dot. Hovering with a mouse or tapping on a phone picks a round.
 */
export function HandicapTrendChart({ data, compact = false }: HandicapTrendChartProps) {
  const { active, track } = usePointPick();

  const handicaps = data.map((d) => d.handicapIndex);

  if (data.length < 2) {
    return <EmptyTrend compact={compact}>Not enough data</EmptyTrend>;
  }
  if (knownValues(handicaps).length === 0) {
    return <EmptyTrend compact={compact}>No handicap yet</EmptyTrend>;
  }

  const W = compact ? L.widthCompact : L.width;
  const H = compact ? L.compactHeight : L.height;
  const gridRight = W - L.axis;
  const labelX = gridRight + L.labelGap;
  const top = L.top;
  const bottom = H - L.bottomRoom;
  const ticksY = H - L.ticksRoom;

  const x = indexScale(data.length, L.inset, gridRight - L.inset);
  const y = scaleLinear()
    .domain(niceExtent(handicaps, 3, 0.5) ?? [9, 13])
    .range([bottom, top]);

  const path =
    line<number | null>()
      .defined((v) => v != null)
      .x((_, i) => x(i))
      .y((v) => y(v!))
      .curve(curveStepAfter)(handicaps) ?? "";
  const ticks = y.ticks(4).filter((v) => v !== y.domain()[0]);

  const last = lastKnownIndex(handicaps);
  const lastValue = last >= 0 ? handicaps[last] : null;
  const dots = [...new Set([last, active])].flatMap((i) => {
    const value = i != null && i >= 0 ? handicaps[i] : null;
    return value != null && i != null ? [{ i, value }] : [];
  });

  const point = active != null ? data[active] : null;
  const pointY = point?.handicapIndex != null ? y(point.handicapIndex) : null;

  return (
    <div data-slot="handicap-trend" className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Handicap index per round"
        className="block w-full touch-pan-y overflow-visible"
        {...track(x, data.length, W)}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={0} x2={gridRight} y1={y(v)} y2={y(v)} stroke={tokens.color.chart.grid} strokeWidth={tokens.lineWidth.border} />
            <TickLabel x={labelX} y={y(v) + L.labelDrop}>
              {formatHandicapIndex(v)}
            </TickLabel>
          </g>
        ))}
        <path d={path} fill="none" stroke={tokens.color.chart.series2} strokeWidth={L.stroke} strokeLinejoin="round" />

        {xTickIndexes(data.length).map((i) => (
          <text
            key={`x-${i}`}
            x={x(i)}
            y={ticksY}
            textAnchor="middle"
            fontSize={tokens.type.label.size}
            fontFamily={tokens.font.sans}
            fill={tokens.color.mutedForeground}
          >
            {data[i].roundIndex}
          </text>
        ))}

        {active != null && (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={top}
            y2={bottom}
            stroke={tokens.color.chart.muted}
            strokeWidth={tokens.lineWidth.border}
            strokeDasharray={tokens.chart.guideDash}
          />
        )}

        {dots.map(({ i, value }) => (
          <circle
            key={`dot-${i}`}
            cx={x(i)}
            cy={y(value)}
            r={active === i ? L.dotHover : L.dotLast}
            fill={tokens.color.chart.series2}
            stroke={tokens.color.card}
            strokeWidth={tokens.lineWidth.outline}
          />
        ))}

        {lastValue != null && (
          <text
            x={x(last) - L.lastLift}
            y={y(lastValue) - L.lastLift}
            textAnchor="end"
            fontSize={tokens.type["body-sm"].size}
            fontWeight="700"
            fontFamily={tokens.font.sans}
            fill={tokens.color.chart.series2}
          >
            {formatHandicapIndex(lastValue)}
          </text>
        )}
      </svg>

      <ChartTooltip
        id={point && active != null && pointY != null ? active : null}
        at={{ x: x(active ?? 0) / W, y: (pointY ?? 0) / H }}
        className="min-w-32"
      >
        {point && point.handicapIndex != null && (
          <>
            <div className="mb-1 text-sm font-bold text-card-foreground">Round {point.roundIndex}</div>
            {point.courseName && (
              <div className="mb-1.5 max-w-40 truncate text-label text-muted-foreground">{point.courseName}</div>
            )}
            <div className="mt-0.5 flex items-center justify-between gap-3">
              <span className="text-muted-foreground">HI</span>
              <span className="font-semibold text-chart-series2">{formatHandicapIndex(point.handicapIndex)}</span>
            </div>
          </>
        )}
      </ChartTooltip>
    </div>
  );
}

/** A grid line's figure, right of the plot: label-sized and muted, unlike a trend's haloed `AxisLabel`. */
function TickLabel({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <text x={x} y={y} fontSize={tokens.type.label.size} fontFamily={tokens.font.sans} fill={tokens.color.mutedForeground}>
      {children}
    </text>
  );
}

function EmptyTrend({ compact, children }: { compact: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center text-sm text-muted-foreground",
        compact ? "h-chart-compact" : "h-chart",
      )}
    >
      {children}
    </div>
  );
}

/** The first round, every fifth after it, and the last: 1, 5, 10, 15, 20. A fifth that would crowd the last gives way. */
function xTickIndexes(count: number): number[] {
  const last = count - 1;
  const fifths = Array.from({ length: Math.floor(last / 5) }, (_, i) => (i + 1) * 5 - 1).filter((i) => last - i > 2);
  return [0, ...fifths.filter((i) => i > 2), last];
}
