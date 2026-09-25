import { colors, fonts, typography } from "@/brand/theme";
import type { HoleResult, ScoreKind } from "@/domain";

interface HoleScoreShapesProps {
  holes: HoleResult[];
}

const VB_W = 30;
const VB_H = 22;
const cx = VB_W / 2;
const cy = VB_H / 2;
const r = 9.5;

/** One hole drawn the way a scorecard marks it: circles under par, boxes over. */
function HoleShape({ kind: key, strokes }: { kind: ScoreKind; strokes: number | null }) {
  const fill = colors.score[key].base;
  const onFill = colors.score[key].onBase;

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-hole-h w-hole-w">
      {key === "eagle" && (
        <>
          <circle cx={cx} cy={cy} r={5} fill={fill} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={fill} strokeWidth={1.5} />
        </>
      )}
      {key === "birdie" && <circle cx={cx} cy={cy} r={r} fill={fill} />}
      {key === "par" && (
        <rect x={0.5} y={0.5} width={VB_W - 1} height={VB_H - 1} rx={3} fill={fill} />
      )}
      {key === "bogey" && (
        <rect x={0.5} y={0.5} width={VB_W - 1} height={VB_H - 1} rx={2} fill={fill} />
      )}
      {key === "double" && (
        <>
          <rect x={2.5} y={2.5} width={VB_W - 5} height={VB_H - 5} rx={1.5} fill={fill} />
          <rect
            x={0.5}
            y={0.5}
            width={VB_W - 1}
            height={VB_H - 1}
            rx={2.5}
            fill="none"
            stroke={fill}
            strokeWidth={1.25}
          />
        </>
      )}
      {(key === "triple" || key === "quad") && (
        <>
          <rect x={0.5} y={0.5} width={VB_W - 1} height={VB_H - 1} rx={2} fill={fill} />
          <line x1={0} y1={7} x2={7} y2={0} stroke={onFill} strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
          <line x1={0} y1={18} x2={18} y2={0} stroke={onFill} strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
          <line x1={0} y1={VB_H} x2={VB_W} y2={0} stroke={onFill} strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
          <line x1={14} y1={VB_H} x2={VB_W} y2={8} stroke={onFill} strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
        </>
      )}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill={onFill}
        fontSize={typography.caption}
        fontWeight="700"
        fontFamily={fonts.sans}
      >
        {strokes}
      </text>
    </svg>
  );
}

/** The scored holes as marked shapes, laid out a nine to a row. */
export function HoleScoreShapes({ holes }: HoleScoreShapesProps) {
  if (holes.length === 0) return null;

  const played = holes.slice(0, 18);
  const rows = [played.slice(0, 9), played.slice(9, 18)].filter((row) => row.length > 0);

  return (
    <div data-slot="hole-score-shapes" className="flex flex-col gap-chip">
      {rows.map((nine, rowIdx) => (
        <div key={rowIdx} className="flex gap-chip">
          {nine.map((hole) =>
            hole.kind == null ? (
              <div
                key={hole.hole}
                className="flex h-hole-h w-hole-w items-center justify-center rounded-sm bg-muted"
              >
                <span className="text-caption font-bold text-muted-foreground">·</span>
              </div>
            ) : (
              <HoleShape key={hole.hole} kind={hole.kind} strokes={hole.strokes} />
            ),
          )}
        </div>
      ))}
    </div>
  );
}
