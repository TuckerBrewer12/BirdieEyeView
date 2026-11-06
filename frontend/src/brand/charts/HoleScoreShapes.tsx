import { tokens } from "@/brand/theme";
import type { HoleSummary, RoundSummary } from "@/domain";

interface HoleScoreShapesProps {
  round: RoundSummary;
  numbered?: boolean;
}

const { width: VB_W, height: VB_H, circle: r, dot, stroke, strokeThin, corner, inset, hatch } = tokens.chart.holeShape;
const cx = VB_W / 2;
const cy = VB_H / 2;

/** A box `by` in from every edge of the mark. */
const boxInset = (by: number) => ({ x: by, y: by, width: VB_W - 2 * by, height: VB_H - 2 * by });

export function HoleShape({ hole }: { hole: HoleSummary }) {
  const kind = hole.kind;
  if (kind == null) {
    return (
      <div className="flex h-hole-h w-hole-w items-center justify-center rounded-sm bg-muted">
        <span className="text-caption font-bold text-muted-foreground">·</span>
      </div>
    );
  }
  const fill = tokens.color.score[kind].base;
  const onFill = tokens.color.score[kind].onBase;

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-hole-h w-hole-w">
      {kind === "eagle" && (
        <>
          <circle cx={cx} cy={cy} r={dot} fill={fill} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={fill} strokeWidth={stroke} />
        </>
      )}
      {kind === "birdie" && <circle cx={cx} cy={cy} r={r} fill={fill} />}
      {kind === "par" && <rect {...boxInset(inset.box)} rx={corner.par} fill={fill} />}
      {kind === "bogey" && <rect {...boxInset(inset.box)} rx={corner.box} fill={fill} />}
      {kind === "double" && (
        <>
          <rect {...boxInset(inset.inner)} rx={corner.inner} fill={fill} />
          <rect {...boxInset(inset.box)} rx={corner.outer} fill="none" stroke={fill} strokeWidth={strokeThin} />
        </>
      )}
      {(kind === "triple" || kind === "quad") && (
        <>
          <rect {...boxInset(inset.box)} rx={corner.box} fill={fill} />
          {hatch.map(([x1, y1, x2, y2]) => (
            <line
              key={`${x1}-${y1}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={onFill}
              strokeWidth={stroke}
              strokeLinecap="round"
              opacity={tokens.opacity.recessed}
            />
          ))}
        </>
      )}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill={onFill}
        fontSize={tokens.type.caption.size}
        fontWeight="700"
        fontFamily={tokens.font.sans}
      >
        {hole.strokes}
      </text>
    </svg>
  );
}

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
