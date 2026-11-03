import { cn } from "@/brand/cn";
import { scoreColorClass, scoreOnFillClass } from "@/brand/theme";
import type { HoleSummary, RoundSummary } from "@/domain";

interface HoleScoreShapesProps {
  round: RoundSummary;
  /** Puts each hole's number above its shape. */
  numbered?: boolean;
}

const VB_W = 30;
const VB_H = 22;
const cx = VB_W / 2;
const cy = VB_H / 2;
const r = 9.5;

/** One hole drawn the way a scorecard marks it: circles under par, boxes over. */
export function HoleShape({ hole }: { hole: HoleSummary }) {
  const kind = hole.kind;
  if (kind == null) {
    return (
      <div className="flex h-hole-h w-hole-w items-center justify-center rounded-sm bg-muted">
        <span className="text-caption font-bold text-muted-foreground">·</span>
      </div>
    );
  }
  // Drawn in currentColor: the shape takes the score's colour from the svg, and the
  // marks on it the ink that reads there from their group.
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className={cn("h-hole-h w-hole-w", scoreColorClass(kind))}>
      {kind === "eagle" && (
        <>
          <circle cx={cx} cy={cy} r={5} fill="currentColor" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={1.5} />
        </>
      )}
      {kind === "birdie" && <circle cx={cx} cy={cy} r={r} fill="currentColor" />}
      {kind === "par" && (
        <rect x={0.5} y={0.5} width={VB_W - 1} height={VB_H - 1} rx={3} fill="currentColor" />
      )}
      {kind === "bogey" && (
        <rect x={0.5} y={0.5} width={VB_W - 1} height={VB_H - 1} rx={2} fill="currentColor" />
      )}
      {kind === "double" && (
        <>
          <rect x={2.5} y={2.5} width={VB_W - 5} height={VB_H - 5} rx={1.5} fill="currentColor" />
          <rect
            x={0.5}
            y={0.5}
            width={VB_W - 1}
            height={VB_H - 1}
            rx={2.5}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.25}
          />
        </>
      )}
      {(kind === "triple" || kind === "quad") && (
        <rect x={0.5} y={0.5} width={VB_W - 1} height={VB_H - 1} rx={2} fill="currentColor" />
      )}
      <g className={scoreOnFillClass(kind)}>
        {(kind === "triple" || kind === "quad") && (
          <>
            <line x1={0} y1={7} x2={7} y2={0} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
            <line x1={0} y1={18} x2={18} y2={0} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
            <line x1={0} y1={VB_H} x2={VB_W} y2={0} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
            <line x1={14} y1={VB_H} x2={VB_W} y2={8} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
          </>
        )}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
          fontWeight="700"
          className="font-sans text-caption"
        >
          {hole.strokes}
        </text>
      </g>
    </svg>
  );
}

/** The round's holes as marked shapes, one row per nine. */
export function HoleScoreShapes({ round, numbered = false }: HoleScoreShapesProps) {
  const nines = [round.frontNine, round.backNine].filter((nine) => nine.holes.length > 0);
  if (nines.length === 0) return null;

  return (
    <div data-slot="hole-score-shapes" className="flex flex-col gap-chip">
      {nines.map((nine, rowIdx) => (
        <div key={rowIdx} className="flex gap-chip">
          {nine.holes.map((hole) =>
            numbered ? (
              <div key={hole.hole} className="flex flex-col items-center gap-hair">
                <span className="text-caption font-semibold text-muted-foreground">{hole.hole}</span>
                <HoleShape hole={hole} />
              </div>
            ) : (
              <HoleShape key={hole.hole} hole={hole} />
            ),
          )}
        </div>
      ))}
    </div>
  );
}
