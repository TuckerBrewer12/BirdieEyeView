import { Trophy } from "lucide-react";
import { cn } from "@/brand/cn";
import { colors, fonts, scoreKeyFor, typography } from "@/brand/theme";
import type { Round } from "@/types/golf";

interface BestRoundHighlightProps {
  round: {
    id: string;
    courseName: string;
    dateLabel: string;
    toParLabel: string;
    totalScore: number | null;
  } | null;
  detail: Round | null;
  onClick?: () => void;
}

const HOLE_VB_W = 30;
const HOLE_VB_H = 22;
const holeCx = HOLE_VB_W / 2;
const holeCy = HOLE_VB_H / 2;
const holeR = 9.5;

function MiniScoreSvg({ strokes, par }: { strokes: number; par: number }) {
  const key = scoreKeyFor(strokes, par);
  const fill = colors.score[key].fill;
  const onFill = colors.score[key].onFill;

  return (
    <svg viewBox={`0 0 ${HOLE_VB_W} ${HOLE_VB_H}`} className="h-hole-h w-hole-w">
      {key === "eagle" && (
        <>
          <circle cx={holeCx} cy={holeCy} r={5} fill={fill} />
          <circle
            cx={holeCx}
            cy={holeCy}
            r={holeR}
            fill="none"
            stroke={fill}
            strokeWidth={1.5}
          />
        </>
      )}
      {key === "birdie" && <circle cx={holeCx} cy={holeCy} r={holeR} fill={fill} />}
      {key === "par" && (
        <rect x={0.5} y={0.5} width={HOLE_VB_W - 1} height={HOLE_VB_H - 1} rx={3} fill={fill} />
      )}
      {key === "bogey" && (
        <rect x={0.5} y={0.5} width={HOLE_VB_W - 1} height={HOLE_VB_H - 1} rx={2} fill={fill} />
      )}
      {key === "double" && (
        <>
          <rect x={2.5} y={2.5} width={HOLE_VB_W - 5} height={HOLE_VB_H - 5} rx={1.5} fill={fill} />
          <rect
            x={0.5}
            y={0.5}
            width={HOLE_VB_W - 1}
            height={HOLE_VB_H - 1}
            rx={2.5}
            fill="none"
            stroke={fill}
            strokeWidth={1.25}
          />
        </>
      )}
      {(key === "triple" || key === "quad") && (
        <>
          <rect x={0.5} y={0.5} width={HOLE_VB_W - 1} height={HOLE_VB_H - 1} rx={2} fill={fill} />
          <line x1={0} y1={7} x2={7} y2={0} stroke={onFill} strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
          <line x1={0} y1={18} x2={18} y2={0} stroke={onFill} strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
          <line x1={0} y1={HOLE_VB_H} x2={HOLE_VB_W} y2={0} stroke={onFill} strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
          <line x1={14} y1={HOLE_VB_H} x2={HOLE_VB_W} y2={8} stroke={onFill} strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
        </>
      )}
      <text
        x={holeCx}
        y={holeCy}
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

function MiniScorecard({ round }: { round: Round }) {
  const holes = round.hole_scores.slice(0, 18);
  if (!holes.length) return null;

  const rows = [holes.slice(0, 9), holes.slice(9, 18)].filter((r) => r.length > 0);

  return (
    <div className="flex flex-col gap-chip">
      {rows.map((nine, rowIdx) => (
        <div key={rowIdx} className="flex gap-chip">
          {nine.map((h, i) => {
            if (h.strokes == null || h.par_played == null) {
              return (
                <div
                  key={i}
                  className="flex h-hole-h w-hole-w items-center justify-center rounded-sm bg-muted"
                >
                  <span className="text-caption font-bold text-muted-foreground">·</span>
                </div>
              );
            }
            return (
              <div key={i}>
                <MiniScoreSvg strokes={h.strokes} par={h.par_played} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function BestRoundHighlight({ round, detail, onClick }: BestRoundHighlightProps) {
  if (!round) {
    return (
      <div data-slot="best-round-highlight" className="p-4 text-center text-sm text-muted-foreground">
        Play a round to unlock highlights!
      </div>
    );
  }

  const skeleton = (
    <div className="flex flex-col gap-chip">
      {[0, 1].map((rowIdx) => (
        <div key={rowIdx} className="flex gap-chip">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-hole-h w-hole-w animate-pulse rounded-sm bg-muted" />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <button
      type="button"
      data-slot="best-round-highlight"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "group flex w-full flex-wrap items-center gap-4 text-left",
        onClick ? "cursor-pointer" : "cursor-default",
      )}
    >
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full border border-score-eagle/30 bg-score-eagle/15 text-score-eagle">
          <Trophy className="size-5" />
        </div>
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-eyebrow text-muted-foreground">
            Best Recent Round
          </div>
          <div className="font-bold leading-tight text-card-foreground transition-colors group-hover:text-primary">
            {round.courseName}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {round.dateLabel} {round.toParLabel ? `· ${round.toParLabel}` : ""}
          </div>
        </div>
      </div>

      <div className="shrink-0 overflow-x-auto">
        {detail ? <MiniScorecard round={detail} /> : skeleton}
      </div>

      <div className="shrink-0 text-right">
        <div className="text-4xl font-black tracking-tighter text-card-foreground transition-colors group-hover:text-primary">
          {round.totalScore}
        </div>
      </div>
    </button>
  );
}
