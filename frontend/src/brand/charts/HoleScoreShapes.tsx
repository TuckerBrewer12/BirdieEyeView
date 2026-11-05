import { tokens } from "@/brand/theme";
import type { HoleSummary, RoundSummary } from "@/domain";

interface HoleScoreShapesProps {
  round: RoundSummary;
  /** Puts each hole's number above its shape. */
  numbered?: boolean;
}

const { width: VB_W, height: VB_H, inset, circle: r, dot, stroke, strokeThin, corner } = tokens.chart.holeShape;
const cx = VB_W / 2;
const cy = VB_H / 2;

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
      {kind === "par" && (
        <rect x={inset} y={inset} width={VB_W - inset * 2} height={VB_H - inset * 2} rx={corner.par} fill={fill} />
      )}
      {kind === "bogey" && (
        <rect x={inset} y={inset} width={VB_W - inset * 2} height={VB_H - inset * 2} rx={corner.box} fill={fill} />
      )}
      {kind === "double" && (
        <>
          <rect x={2.5} y={2.5} width={VB_W - 5} height={VB_H - 5} rx={corner.inner} fill={fill} />
          <rect
            x={0.5}
            y={0.5}
            width={VB_W - 1}
            height={VB_H - 1}
            rx={corner.outer}
            fill="none"
            stroke={fill}
            strokeWidth={strokeThin}
          />
        </>
      )}
      {(kind === "triple" || kind === "quad") && (
        <>
          <rect x={0.5} y={0.5} width={VB_W - 1} height={VB_H - 1} rx={corner.box} fill={fill} />
          <line x1={0} y1={7} x2={7} y2={0} stroke={onFill} strokeWidth={stroke} strokeLinecap="round" opacity={tokens.opacity.recessed} />
          <line x1={0} y1={18} x2={18} y2={0} stroke={onFill} strokeWidth={stroke} strokeLinecap="round" opacity={tokens.opacity.recessed} />
          <line x1={0} y1={VB_H} x2={VB_W} y2={0} stroke={onFill} strokeWidth={stroke} strokeLinecap="round" opacity={tokens.opacity.recessed} />
          <line x1={14} y1={VB_H} x2={VB_W} y2={8} stroke={onFill} strokeWidth={stroke} strokeLinecap="round" opacity={tokens.opacity.recessed} />
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
