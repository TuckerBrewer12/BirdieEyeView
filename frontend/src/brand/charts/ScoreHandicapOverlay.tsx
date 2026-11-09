import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { cn } from "@/brand/cn";
import { tokens, underParDotFill } from "@/brand/theme";
import { formatHandicapIndex, type RoundTrendPoint } from "@/domain";
import { indexScale, knownValues, lastKnownIndex, steppedExtent, stepsWithin } from "./scales";

interface ScoreHandicapOverlayProps {
  /** The rounds to draw, oldest first: the window the screen picked. */
  data: RoundTrendPoint[];
  /** The phone's shorter, narrower plot. */
  compact?: boolean;
  className?: string;
}

const O = tokens.chart.overlay;

/**
 * Scores and the handicap index on one plot: each round's score as a dot with its figure over it,
 * a faint line joining them, par dashed across, and the index as a line on its own scale with its
 * figures down the right. The dashboard's scores card; the trend charts draw them apart.
 */
export function ScoreHandicapOverlay({ data, compact = false, className }: ScoreHandicapOverlayProps) {
  const scores = data.map((d) => d.score);
  const handicaps = data.map((d) => d.handicapIndex);
  const label = `Scores over the last ${data.length} rounds: ${knownValues(scores).join(", ")}`;

  if (data.length < 2 || knownValues(scores).length === 0) {
    return (
      <div
        data-slot="score-handicap-overlay"
        className={cn("flex items-center justify-center text-sm text-muted-foreground", compact ? "h-36" : "h-48", className)}
      >
        Play two rounds to see the trend
      </div>
    );
  }

  const W = compact ? O.widthCompact : O.width;
  const H = compact ? O.heightCompact : O.height;
  const gridLeft = compact ? O.gridLeftCompact : O.gridLeft;
  const gridRight = W - (compact ? O.gridRightCompact : O.gridRight);
  const dotR = compact ? O.dotCompact : O.dot;
  const lift = compact ? O.figureLiftCompact : O.figureLift;
  const latestOffset = compact ? O.latestOffsetCompact : O.latestOffset;

  // The par of the latest round that has one.
  const par = [...data].reverse().find((d) => d.par != null)?.par ?? null;

  const x = indexScale(data.length, compact ? O.leftCompact : O.left, W - (compact ? O.rightCompact : O.right));
  // Scores run from the five below the lowest to the ten above the highest, gridded every ten;
  // the index from the whole point below its lowest to the one above its highest.
  const yScore = scaleLinear()
    .domain(steppedExtent([...scores, par], O.scoreFloor, O.scoreCeiling) ?? [70, 90])
    .range([H - O.bottom, O.top]);
  const yHandicap = scaleLinear()
    .domain(steppedExtent(handicaps, 1, 1) ?? [12, 15])
    .range([H - O.bottom, O.top]);

  const scoreTicks = stepsWithin(yScore.domain(), O.scoreCeiling);
  const handicapTicks = knownValues(handicaps).length > 0 ? stepsWithin(yHandicap.domain(), 1) : [];
  const parY = par != null ? yScore(par) : null;

  const trace = (scale: (v: number) => number) =>
    line<number | null>()
      .defined((v) => v != null)
      .x((_, i) => x(i))
      .y((v) => scale(v!));
  const scorePath = trace(yScore)(scores) ?? "";
  const handicapPath = trace(yHandicap)(handicaps) ?? "";
  const lastHandicap = lastKnownIndex(handicaps);
  // Every score keeps its figure on a short run; a long one keeps the latest and the lowest.
  const known = knownValues(scores);
  const lowest = scores.indexOf(Math.min(...known));
  const labelled = (i: number) => data.length <= O.labelAll || i === lastKnownIndex(scores) || i === lowest;
  const latestIndex = lastHandicap >= 0 ? handicaps[lastHandicap] : null;

  const tick = { fontSize: tokens.type.label.size, fill: tokens.color.mutedForeground };

  return (
    <div data-slot="score-handicap-overlay" className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block h-auto w-full overflow-visible">
        {scoreTicks.map((v) => (
          <g key={v}>
            <line
              x1={gridLeft}
              x2={gridRight}
              y1={yScore(v)}
              y2={yScore(v)}
              stroke={tokens.color.chart.grid}
              strokeWidth={tokens.lineWidth.border}
            />
            <text x={0} y={yScore(v)} dominantBaseline="central" {...tick}>
              {v}
            </text>
          </g>
        ))}
        {parY != null && (
          <g>
            <line
              x1={gridLeft}
              x2={gridRight}
              y1={parY}
              y2={parY}
              stroke={tokens.color.chart.reference}
              strokeWidth={tokens.lineWidth.border}
              strokeDasharray={O.dash}
            />
            <text x={0} y={parY} dominantBaseline="central" {...tick}>
              Par
            </text>
          </g>
        )}
        {handicapTicks.map((v) => (
          <text
            key={v}
            x={W}
            y={yHandicap(v)}
            dominantBaseline="central"
            textAnchor="end"
            fontSize={tokens.type.label.size}
            fontWeight={500}
            fill={tokens.color.chart.series2}
          >
            {v}
          </text>
        ))}

        <path
          d={handicapPath}
          fill="none"
          stroke={tokens.color.chart.series2}
          strokeWidth={O.handicapStroke}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {handicaps.map((v, i) =>
          v != null ? <circle key={i} cx={x(i)} cy={yHandicap(v)} r={O.handicapDot} fill={tokens.color.chart.series2} /> : null,
        )}
        {latestIndex != null && (
          <text
            x={x(lastHandicap) + latestOffset.x}
            y={yHandicap(latestIndex) + latestOffset.y}
            fontSize={tokens.type["body-sm"].size}
            fontWeight={700}
            fill={tokens.color.chart.series2}
          >
            {formatHandicapIndex(latestIndex)}
          </text>
        )}

        <path
          d={scorePath}
          fill="none"
          stroke={tokens.color.borderStrong}
          strokeWidth={O.scoreStroke}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((d, i) =>
          d.score != null ? (
            <g key={i}>
              <circle
                cx={x(i)}
                cy={yScore(d.score)}
                r={dotR}
                fill={underParDotFill(d.toPar)}
                stroke={tokens.color.card}
                strokeWidth={O.rim}
              />
              {labelled(i) && (
                <text
                  x={x(i)}
                  y={yScore(d.score) - lift}
                  textAnchor="middle"
                  fontSize={tokens.type["body-sm"].size}
                  fontWeight={700}
                  fill={tokens.color.foreground}
                >
                  {d.score}
                </text>
              )}
            </g>
          ) : null,
        )}
      </svg>
    </div>
  );
}

/** The scores card's key: a dot for a score, a line for the index. */
export function ScoreHandicapOverlayLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3.5 text-body-sm text-foreground-secondary", className)}>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-foreground" />
        Score
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-3.5 bg-chart-series2" />
        Handicap
      </span>
    </div>
  );
}
