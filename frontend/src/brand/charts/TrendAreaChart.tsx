import { useId, useState, type PointerEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { scaleLinear } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { cn } from "@/brand/cn";
import {
  borderWidth,
  chartColors,
  chartLayout,
  colors,
  fonts,
  motion as motionTokens,
  opacityWash,
  ringWidth,
  space,
  typography,
} from "@/brand/theme";
import { indexScale, knownValues, paddedExtent } from "./scales";

type TrendAreaTone = "primary" | "birdie" | "bogey" | "eagle" | "neutral" | "contrast";

const STROKE: Record<TrendAreaTone, string> = {
  primary: colors.primary,
  birdie: colors.score.birdie.base,
  bogey: colors.score.bogey.base,
  eagle: colors.score.eagle.base,
  neutral: colors.mutedForeground,
  contrast: colors.score.triple.text,
};

// Spelled out in full so Tailwind finds every class when it scans the source.
const SWATCH: Record<TrendAreaTone, string> = {
  primary: "bg-primary",
  birdie: "bg-score-birdie-base",
  bogey: "bg-score-bogey-base",
  eagle: "bg-score-eagle-base",
  neutral: "bg-muted-foreground",
  contrast: "bg-score-triple",
};

interface TrendAreaSeries {
  /** Names the line in the tooltip, and in a legend when there are two. */
  label: string;
  tone?: TrendAreaTone;
}

interface TrendAreaPoint {
  /** Under the point on the bottom axis: the round number. */
  tick: string | number;
  /** The tooltip's heading: "Round 12". */
  title: string;
  /** A quieter line under the heading, like the course. */
  subtitle?: string | null;
  /** One value per series, in the same order. Null leaves a gap. */
  values: (number | null)[];
  /** More figures for the tooltip, under the series values. */
  notes?: { label: string; value: string }[];
}

interface TrendAreaChartProps {
  /** One per round, oldest first. */
  points: TrendAreaPoint[];
  /** The first is the figure, drawn over a soft fill. A second is drawn as a thinner line beside it. */
  series: [TrendAreaSeries] | [TrendAreaSeries, TrendAreaSeries];
  /** How a value reads on the axis and in the tooltip. */
  format?: (value: number) => string;
  /** The value range to draw against. Defaults to the values' own range, padded. */
  domain?: [number, number];
  /** A dashed line across at a value worth measuring against: the average, par. */
  reference?: { value: number; label: string } | null;
  className?: string;
  "aria-label"?: string;
}

/**
 * A figure over a golfer's rounds: one line over a soft fill, oldest on the left, with a second
 * line beside it if wanted. Hovering with a mouse or tapping on a phone picks a round and shows
 * its figures.
 */
export function TrendAreaChart({
  points,
  series,
  format = String,
  domain,
  reference,
  className,
  "aria-label": ariaLabel,
}: TrendAreaChartProps) {
  const layout = chartLayout.trendArea;
  const { width: W, height: H, pad: PAD } = layout;
  const gradientId = `trend-area-${useId().replace(/:/g, "")}`;
  const [active, setActive] = useState<number | null>(null);

  const first = points.map((point) => point.values[0] ?? null);
  if (points.length < 2 || knownValues(first).length < 2) {
    return (
      <div data-slot="trend-area-chart" className="flex h-chart items-center justify-center text-sm text-muted-foreground">
        Not enough data
      </div>
    );
  }

  const all = points.flatMap((point) => point.values);
  const extent = domain ?? paddedExtent([...all, reference?.value], { ratio: layout.headroom })!;
  const x = indexScale(points.length, PAD.left, W - PAD.right);
  const y = scaleLinear().domain(extent).range([H - PAD.bottom, PAD.top]);
  const baseline = H - PAD.bottom;

  const valuesOf = (i: number) => points.map((point) => point.values[i] ?? null);
  const trace = line<number | null>()
    .defined((v) => v != null)
    .x((_, i) => x(i))
    .y((v) => y(v!))
    .curve(curveMonotoneX);
  const shade = area<number | null>()
    .defined((v) => v != null)
    .x((_, i) => x(i))
    .y0(baseline)
    .y1((v) => y(v!))
    .curve(curveMonotoneX);

  const lead = STROKE[series[0].tone ?? "primary"];
  const showDots = points.length <= layout.maxDots;
  const xTicks = tickIndexes(points.length, layout.xTicks);

  const indexAt = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = Math.round(x.invert((event.clientX - rect.left) * (W / rect.width)));
    return Math.max(0, Math.min(points.length - 1, index));
  };

  const point = active != null ? points[active] : null;
  const pointValue = point?.values.find((value) => value != null) ?? null;
  const pointY = pointValue != null ? y(pointValue) : null;

  return (
    <div data-slot="trend-area-chart" className={cn("relative flex flex-col gap-2 select-none", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-pan-y overflow-visible"
        role="img"
        aria-label={ariaLabel}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse") setActive(indexAt(event));
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setActive(null);
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse") return;
          // A tap picks a round and a second tap on it puts it down.
          const index = indexAt(event);
          setActive(active === index ? null : index);
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lead} stopOpacity={opacityWash} />
            <stop offset="100%" stopColor={lead} stopOpacity={0} />
          </linearGradient>
        </defs>

        {y.ticks(layout.yTicks).map((tick) => (
          <g key={`y-${tick}`}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} stroke={chartColors.muted} strokeWidth={borderWidth} />
            <AxisLabel x={PAD.left - 8} y={y(tick) + 4} anchor="end">
              {format(tick)}
            </AxisLabel>
          </g>
        ))}

        {xTicks.map((i) => (
          <AxisLabel key={`x-${i}`} x={x(i)} y={baseline + 16} anchor="middle">
            {points[i].tick}
          </AxisLabel>
        ))}

        {reference && (
          <g data-slot="trend-area-reference">
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(reference.value)}
              y2={y(reference.value)}
              stroke={chartColors.axis}
              strokeWidth={borderWidth}
              strokeDasharray={`${space.dot} ${space.dot}`}
            />
            <AxisLabel x={W - PAD.right} y={y(reference.value) - 6} anchor="end">
              {reference.label}
            </AxisLabel>
          </g>
        )}

        <path d={shade(first) ?? ""} fill={`url(#${gradientId})`} stroke="none" />

        {series.map((s, i) => (
          <path
            key={s.label}
            d={trace(valuesOf(i)) ?? ""}
            fill="none"
            stroke={STROKE[s.tone ?? "primary"]}
            strokeWidth={i === 0 ? layout.stroke : layout.strokeSecondary}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {active != null && pointY != null && (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={PAD.top}
            y2={baseline}
            stroke={chartColors.muted}
            strokeWidth={borderWidth}
            strokeDasharray={`${space.dot} ${space.dot}`}
          />
        )}

        {series.map((s, i) =>
          points.map((p, index) => {
            const value = p.values[i];
            if (value == null || (!showDots && active !== index)) return null;
            return (
              <circle
                key={`dot-${i}-${index}`}
                cx={x(index)}
                cy={y(value)}
                r={active === index ? layout.dotHover : layout.dot}
                fill={STROKE[s.tone ?? "primary"]}
                stroke={colors.card}
                strokeWidth={space.bar}
              />
            );
          }),
        )}
      </svg>

      {series.length > 1 && (
        <div className="flex items-center justify-center gap-4">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5 text-caption text-muted-foreground">
              <span className={cn("size-2 rounded-full", SWATCH[s.tone ?? "primary"])} />
              {s.label}
            </span>
          ))}
        </div>
      )}

      <AnimatePresence>
        {point && active != null && pointY != null && (
          <motion.div
            key={active}
            data-slot="trend-area-tooltip"
            className={cn(
              "pointer-events-none absolute z-10 min-w-32 -translate-y-full rounded-xl border border-border bg-card/95 px-3 py-2.5 text-body-sm shadow-card",
              // Past two thirds of the way across, the card opens to the left of the point.
              x(active) > W * 0.65 ? "-ml-3 -translate-x-full" : "ml-3",
            )}
            style={{ left: `${(x(active) / W) * 100}%`, top: `${(pointY / H) * 100}%` }}
            initial={{ opacity: 0, scale: motionTokens.tapScale }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: motionTokens.tapScale }}
            transition={{ duration: motionTokens.duration.collapse }}
          >
            <div className="text-sm font-bold text-card-foreground">{point.title}</div>
            {point.subtitle && (
              <div className="max-w-40 truncate text-label text-muted-foreground">{point.subtitle}</div>
            )}
            <div className="mt-1.5 flex flex-col gap-0.5">
              {series.map((s, i) => (
                <TooltipRow key={s.label} label={s.label}>
                  {point.values[i] != null ? format(point.values[i]!) : "—"}
                </TooltipRow>
              ))}
              {point.notes?.map((note) => (
                <TooltipRow key={note.label} label={note.label}>
                  {note.value}
                </TooltipRow>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TooltipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-card-foreground tabular-nums">{children}</span>
    </div>
  );
}

function AxisLabel({
  x,
  y,
  anchor,
  children,
}: {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  children: ReactNode;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={typography.label}
      fontWeight="600"
      fontFamily={fonts.sans}
      fill={chartColors.axis}
      paintOrder="stroke"
      stroke={colors.card}
      strokeWidth={ringWidth}
      strokeLinejoin="round"
    >
      {children}
    </text>
  );
}

/** About `count` evenly spaced indexes from the first, always ending on the last. */
function tickIndexes(length: number, count: number): number[] {
  const step = Math.max(1, Math.ceil((length - 1) / (count - 1)));
  const ticks = Array.from({ length: Math.ceil(length / step) }, (_, i) => i * step).filter((i) => i < length);
  // Drop a tick that would crowd the last one.
  if (ticks.length > 1 && length - 1 - ticks[ticks.length - 1] < step / 2) ticks.pop();
  if (ticks[ticks.length - 1] !== length - 1) ticks.push(length - 1);
  return ticks;
}

export type { TrendAreaChartProps, TrendAreaPoint, TrendAreaSeries, TrendAreaTone };
