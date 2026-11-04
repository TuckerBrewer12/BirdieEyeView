import type { ReactNode } from "react";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { StatDelta } from "@/brand/components/Stat";
import { differentialFill, tokens } from "@/brand/theme";
import { formatHandicapIndex, type RoundTrendPoint } from "@/domain";
import { indexScale, knownValues } from "./scales";

const C = tokens.chart.counting;
const S = C.spark;

interface HandicapIndexPanelProps {
  data: RoundTrendPoint[];
}

/** Differentials the server marked as counting toward the index. */
function countingDifferentials(data: RoundTrendPoint[]): number[] {
  return data.filter((d) => d.differentialStatus === "counting" && d.differential != null).map((d) => d.differential!);
}

/**
 * The handicap-led card: the index and how far it moved, its line over the
 * rounds, then which rounds count. Each round's differential stands on a stem
 * from the cut-off; the ones the index is worked from are filled.
 */
export function HandicapIndexPanel({ data }: HandicapIndexPanelProps) {
  const indexes = data.map((d) => d.handicapIndex);
  const countingDiffs = countingDifferentials(data);
  const known = knownValues(indexes);
  const first = known.at(0) ?? null;
  const last = known.at(-1) ?? null;
  const moved = first != null && last != null ? last - first : null;

  return (
    <div data-slot="handicap-index-panel" className="flex flex-col gap-4.5 text-foreground">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-body-sm font-semibold text-foreground-secondary">Handicap index</div>
          <div className="flex items-baseline gap-2.5">
            <div className="text-index">{formatHandicapIndex(last)}</div>
            {moved != null && moved !== 0 && (
              <StatDelta direction={moved < 0 ? "down" : "up"} className="rounded-full bg-muted px-2 py-chip text-body-sm">
                {Math.abs(moved).toFixed(1)} over {data.length} rounds
              </StatDelta>
            )}
          </div>
        </div>
        {known.length > 1 && (
          <div className="flex flex-col items-end gap-1">
            <IndexLine indexes={indexes} />
            <div className="text-label text-muted-foreground">
              {formatHandicapIndex(first)} → {formatHandicapIndex(last)}
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-chart-grid" />

      <div className="flex items-baseline justify-between">
        <div className="text-body font-semibold">Which rounds count</div>
        <div className="text-body-sm text-muted-foreground">
          Score differential · best {countingDiffs.length} of {data.length}
        </div>
      </div>

      <DifferentialChart data={data} countingDiffs={countingDiffs} />
    </div>
  );
}

/** The index over the rounds: a plain line ending in a dot. */
function IndexLine({ indexes }: { indexes: (number | null)[] }) {
  const known = knownValues(indexes);
  const x = indexScale(indexes.length, S.pad, S.width - S.pad);
  const y = scaleLinear()
    .domain([Math.min(...known), Math.max(...known)])
    .range([S.height - S.pad, S.pad]);
  const points = indexes.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] != null);
  const path = line<readonly [number, number]>()
    .x(([i]) => x(i))
    .y(([, v]) => y(v))(points);
  const [endI, endV] = points[points.length - 1];

  return (
    <svg width={S.width} height={S.height} viewBox={`0 0 ${S.width} ${S.height}`} role="img" aria-label="Handicap index over the rounds">
      <path d={path ?? undefined} fill="none" stroke={tokens.color.chart.series2} strokeWidth={S.stroke} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(endI)} cy={y(endV)} r={S.dot} fill={tokens.color.chart.series2} />
    </svg>
  );
}

/** Each round's differential on a stem from the cut-off; the counting ones filled. */
function DifferentialChart({ data, countingDiffs }: { data: RoundTrendPoint[]; countingDiffs: number[] }) {
  const diffs = data.map((d) => d.differential);
  const cutoff = countingDiffs.length > 0 ? Math.max(...countingDiffs) : null;
  const known = knownValues(diffs);
  if (known.length === 0) {
    return <div className="flex h-chart items-center justify-center text-body-sm text-muted-foreground">No rated rounds yet</div>;
  }

  const x = indexScale(data.length, C.inset, C.plot - C.inset);
  // A stroke of room past the highest and lowest differential, not widened to round steps,
  // so the dots fill the plot and the grid lands on the few round numbers inside it.
  const y = scaleLinear()
    .domain([Math.min(...known) - C.headroom, Math.max(...known) + C.headroom])
    .range([C.height - C.bottomRoom, C.inset]);
  const grid = y.ticks(3);
  const roundTicks = [0, 4, 9, 14, 19].filter((i) => i < data.length);
  const cutY = cutoff != null ? y(cutoff) : null;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${C.width} ${C.height}`}
      role="img"
      aria-label={`Score differential per round; ${countingDiffs.length} rounds count toward the index`}
      className="block overflow-visible"
    >
      {grid.map((v) => (
        <g key={v}>
          <line x1={0} x2={C.plot} y1={y(v)} y2={y(v)} stroke={tokens.color.chart.grid} strokeWidth={tokens.lineWidth.border} />
          <AxisLabel x={C.plot + C.labelGap} y={y(v) + 4}>{v}</AxisLabel>
        </g>
      ))}
      {data.map((d, i) => {
        if (d.differential == null) return null;
        const counts = d.differentialStatus === "counting";
        // Counting rounds are filled; a round close to the cut-off is ringed in its status colour.
        const ring = d.differentialStatus === "close" ? differentialFill("close") : tokens.color.chart.reference;
        const cy = y(d.differential);
        return (
          <g key={d.roundIndex}>
            {cutY != null && (
              <line
                x1={x(i)}
                x2={x(i)}
                y1={cutY}
                y2={cy}
                stroke={counts ? differentialFill("counting") : tokens.color.borderStrong}
                strokeWidth={C.stem}
              />
            )}
            <circle
              cx={x(i)}
              cy={cy}
              r={counts ? C.dotCounts : C.dot}
              fill={counts ? differentialFill("counting") : tokens.color.card}
              stroke={counts ? tokens.color.card : ring}
              strokeWidth={C.stem}
            />
          </g>
        );
      })}
      {cutY != null && cutoff != null && (
        <>
          <line x1={0} x2={C.plot} y1={cutY} y2={cutY} stroke={tokens.color.primary} strokeWidth={C.stem} strokeDasharray={C.dash} />
          <AxisLabel x={C.plot + C.labelGap} y={cutY + 4} strong>
            {cutoff.toFixed(1)}
          </AxisLabel>
        </>
      )}
      {roundTicks.map((i) => (
        <AxisLabel key={i} x={x(i)} y={C.ticks} anchor="middle">
          {i + 1}
        </AxisLabel>
      ))}
    </svg>
  );
}

function AxisLabel({
  x,
  y,
  anchor = "start",
  strong = false,
  children,
}: {
  x: number;
  y: number;
  anchor?: "start" | "middle";
  strong?: boolean;
  children: ReactNode;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={tokens.type.label.size}
      fontFamily={tokens.font.sans}
      fontWeight={strong ? 700 : 400}
      fill={strong ? tokens.color.primary : tokens.color.mutedForeground}
    >
      {children}
    </text>
  );
}
