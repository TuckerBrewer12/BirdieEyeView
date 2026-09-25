import { useId, useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { scaleLinear } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import {
  chartColors,
  chartLayout,
  colors,
  fonts,
  motion as motionTokens,
  toParFill,
  typography,
} from "@/brand/theme";
import { formatHandicapIndex } from "@/domain/handicap";

export interface ScoreHandicapTrendPoint {
  round_index: number;
  total_score: number | null;
  to_par: number | null;
  handicap_index: number | null;
  course_name?: string | null;
  used_in_hi?: boolean | null;
  differential?: number | null;
  hi_threshold?: number | null;
}

interface SVGScoreHandicapTrendProps {
  data: ScoreHandicapTrendPoint[];
  scoreColor: string;
  handicapColor: string;
  gridColor: string;
}

function getDotColor(toPar: number | null): string {
  return toParFill(toPar);
}

function getBarColor(d: ScoreHandicapTrendPoint): string {
  if (d.used_in_hi == null) return colors.score.par.base;
  if (d.used_in_hi) return colors.score.birdie.base;
  if (d.hi_threshold != null && d.differential != null && d.differential - d.hi_threshold <= 2) {
    return colors.score.eagle.base;
  }
  return colors.destructive;
}

export function SVGScoreHandicapTrend({
  data,
  scoreColor,
  handicapColor,
  gridColor,
}: SVGScoreHandicapTrendProps) {
  const plot = chartLayout.plot;
  const W = plot.width;
  const H = plot.height;
  const PAD = plot.pad;
  const gradId = useId().replace(/:/g, "");
  const hiGrad = `hiGrad${gradId}`;
  const [hovered, setHovered] = useState<ScoreHandicapTrendPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (data.length < 2) {
    return (
      <div className="flex h-chart items-center justify-center text-sm text-muted-foreground">
        Not enough data
      </div>
    );
  }

  const validScores = data.filter((d) => d.total_score != null);
  const validHI = data.filter((d) => d.handicap_index != null);

  if (validScores.length === 0) {
    return (
      <div className="flex h-chart items-center justify-center text-sm text-muted-foreground">
        No score data
      </div>
    );
  }

  const xScale = scaleLinear()
    .domain([0, data.length - 1])
    .range([PAD.left, W - PAD.right]);

  const scoreMin = Math.min(...validScores.map((d) => d.total_score!));
  const scoreMax = Math.max(...validScores.map((d) => d.total_score!));
  const yScoreScale = scaleLinear()
    .domain([scoreMin - 5, scoreMax + 5])
    .range([H - PAD.bottom, PAD.top]);

  const hiMin = validHI.length ? Math.min(...validHI.map((d) => d.handicap_index!)) : 0;
  const hiMax = validHI.length ? Math.max(...validHI.map((d) => d.handicap_index!)) : 10;
  const yHIScale = scaleLinear()
    .domain([hiMin - 0.5, hiMax + 0.5])
    .range([H - PAD.bottom, PAD.top]);

  const scoreLine = line<ScoreHandicapTrendPoint>()
    .defined((d) => d.total_score != null)
    .x((_, i) => xScale(i))
    .y((d) => yScoreScale(d.total_score!))
    .curve(curveMonotoneX);

  const hiLine = line<ScoreHandicapTrendPoint>()
    .defined((d) => d.handicap_index != null)
    .x((_, i) => xScale(i))
    .y((d) => yHIScale(d.handicap_index!))
    .curve(curveMonotoneX);

  const hiArea = area<ScoreHandicapTrendPoint>()
    .defined((d) => d.handicap_index != null)
    .x((_, i) => xScale(i))
    .y0(H - PAD.bottom)
    .y1((d) => yHIScale(d.handicap_index!))
    .curve(curveMonotoneX);

  const scorePathD = scoreLine(data) ?? "";
  const hiLineD = hiLine(data) ?? "";
  const hiAreaD = hiArea(data) ?? "";

  const gridTicks = yScoreScale.ticks(5);
  const hiTicks = yHIScale.ticks(4);
  const barW = Math.max(
    plot.barMin,
    Math.min(plot.barMax, (W - PAD.left - PAD.right) / data.length - plot.barGap),
  );
  const baseline = H - PAD.bottom;

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (W / rect.width);
    const idx = Math.round(xScale.invert(svgX));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    setHovered(data[clamped] ?? null);
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => setHovered(null);

  const showLabels = data.length <= 15;
  const hoveredIndex = hovered ? data.indexOf(hovered) : -1;

  return (
    <div data-slot="score-handicap-trend" className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id={hiGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="10%" stopColor={handicapColor} stopOpacity={0.1} />
            <stop offset="100%" stopColor={handicapColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        {gridTicks.map((v) => (
          <line
            key={`grid-${v}`}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={yScoreScale(v)}
            y2={yScoreScale(v)}
            stroke={gridColor}
            strokeWidth={1}
          />
        ))}

        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={H - PAD.bottom}
          y2={H - PAD.bottom}
          stroke={chartColors.muted}
          strokeWidth={1}
        />

        {gridTicks.map((v) => (
          <text
            key={`yl-${v}`}
            x={PAD.left - 12}
            y={yScoreScale(v) + 4}
            textAnchor="end"
            fontSize={typography.label}
            fontWeight="600"
            fontFamily={fonts.sans}
            fill={chartColors.axis}
            paintOrder="stroke"
            stroke={colors.card}
            strokeWidth={4}
            strokeLinejoin="round"
          >
            {v}
          </text>
        ))}

        {validHI.length > 0 &&
          hiTicks.map((v) => (
            <text
              key={`yr-${v}`}
              x={W - PAD.right + 12}
              y={yHIScale(v) + 4}
              textAnchor="start"
              fontSize={typography.label}
              fontWeight="600"
              fontFamily={fonts.sans}
              fill={handicapColor}
              paintOrder="stroke"
              stroke={colors.card}
              strokeWidth={4}
              strokeLinejoin="round"
            >
              {formatHandicapIndex(v)}
            </text>
          ))}

        {data.map((d, i) => {
          if (d.total_score == null) return null;
          const barTop = yScoreScale(d.total_score);
          const barHeight = baseline - barTop;
          if (barHeight <= 0) return null;
          return (
            <rect
              key={`bar-${i}`}
              x={xScale(i) - barW / 2}
              y={barTop}
              width={barW}
              height={barHeight}
              fill={getBarColor(d)}
              fillOpacity={0.6}
              rx={2}
            />
          );
        })}

        {validHI.length > 0 && <path d={hiAreaD} fill={`url(#${hiGrad})`} stroke="none" />}

        {validHI.length > 0 && (
          <path
            d={hiLineD}
            fill="none"
            stroke={handicapColor}
            strokeWidth={1.5}
            strokeOpacity={0.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        <path
          d={scorePathD}
          fill="none"
          stroke={scoreColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((d, i) => {
          if (d.total_score == null) return null;
          const cx = xScale(i);
          const cy = yScoreScale(d.total_score);
          const isHovered = hovered?.round_index === d.round_index;
          return (
            <circle
              key={`dot-${i}`}
              cx={cx}
              cy={cy}
              r={isHovered ? plot.dotHover : plot.dot}
              fill={getDotColor(d.to_par)}
              stroke={colors.card}
              strokeWidth={1.5}
            />
          );
        })}

        {showLabels &&
          data.map((d, i) => {
            if (d.total_score == null) return null;
            const cx = xScale(i);
            const cy = yScoreScale(d.total_score);
            return (
              <text
                key={`lbl-${i}`}
                x={cx}
                y={cy - 8}
                textAnchor="middle"
                fontSize={typography.caption}
                fontFamily={fonts.sans}
                fill={chartColors.axis}
                fontWeight="600"
              >
                {d.total_score}
              </text>
            );
          })}

        {hovered && hovered.total_score != null && hoveredIndex >= 0 && (
          <line
            x1={xScale(hoveredIndex)}
            x2={xScale(hoveredIndex)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke={chartColors.muted}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}
      </svg>

      <AnimatePresence>
        {hovered && hovered.total_score != null && (
          <motion.div
            key={hovered.round_index}
            className="pointer-events-none absolute z-10 min-w-32 rounded-xl border border-border bg-card/95 px-3 py-2.5 text-body-sm shadow-card"
            style={{
              left: tooltipPos.x + (tooltipPos.x > W * 0.65 ? -150 : 14),
              top: tooltipPos.y - 10,
            }}
            initial={{ opacity: 0, scale: motionTokens.tapScale, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: motionTokens.tapScale, y: 4 }}
            transition={{ duration: motionTokens.duration.collapse }}
          >
            <div className="mb-1 text-sm font-bold text-card-foreground">
              Round {hovered.round_index}
            </div>
            {hovered.course_name && (
              <div className="mb-1.5 max-w-40 truncate text-label text-muted-foreground">
                {hovered.course_name}
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Score</span>
              <span className="font-semibold text-card-foreground">{hovered.total_score}</span>
            </div>
            {hovered.handicap_index != null && (
              <div className="mt-0.5 flex items-center justify-between gap-3">
                <span className="text-muted-foreground">HI</span>
                <span className="font-semibold" style={{ color: handicapColor }}>
                  {formatHandicapIndex(hovered.handicap_index)}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
