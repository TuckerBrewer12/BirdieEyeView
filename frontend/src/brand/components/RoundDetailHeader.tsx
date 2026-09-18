import { cn } from "@/brand/cn";
import { PageTitle } from "./PageTitle";
import { scoreFill, scoreKeyFor, scoreTone, toParDisplay, type ScoreKey } from "@/brand/theme";
import { pluralNoun } from "@/lib/pluralize";

const BAR_HEIGHTS: Record<ScoreKey, number> = {
  eagle: 28, birdie: 40, par: 52, bogey: 72, double: 92, triple: 100, quad: 100,
};

const CHIPS: { key: ScoreKey; noun: string; plural?: string; absorbs?: ScoreKey }[] = [
  { key: "birdie", noun: "Birdie" },
  { key: "par",    noun: "Par" },
  { key: "bogey",  noun: "Bogey" },
  { key: "double", noun: "Double" },
  { key: "triple", noun: "Triple+", plural: "Triples+", absorbs: "quad" },
  { key: "eagle",  noun: "Eagle" },
];

export interface HeaderHole {
  hole: number;
  strokes: number;
  par: number | null;
}

export interface HeaderNine {
  holes: HeaderHole[];
  /** Omitted for a part-played nine, matching the round list. */
  total: number | null;
}

export interface RoundDetailHeaderProps {
  courseName: string;
  /** "Mon · Jun 15 · 2026" */
  dateLabel?: string | null;
  tee?: { box?: string | null; rating?: string | null };
  score: {
    total: number;
    toPar: number | null;
    net?: number | null;
    courseHandicap?: number | null;
  };
  nines?: { front: HeaderNine; back: HeaderNine };
  stats?: { putts?: number | null; gir?: number | null };
  counts?: Partial<Record<ScoreKey, number>>;
  className?: string;
}

function Nine({ nine, label, className }: {
  nine: HeaderNine;
  label: string;
  className?: string;
}) {
  if (nine.holes.length === 0) return null;
  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <div className="flex h-6 items-end gap-hair">
        {nine.holes.map((h) => {
          const key = scoreKeyFor(h.strokes, h.par);
          return (
            <div
              key={h.hole}
              // Par is the baseline, so it recedes and the misses stand out.
              className={cn("flex-1 rounded-t-tick", key === "par" && "opacity-(--brand-opacity-recessed)")}
              style={{
                height: `${BAR_HEIGHTS[key]}%`,
                background: scoreFill(h.strokes, h.par),
              }}
            />
          );
        })}
      </div>
      {nine.total != null && (
        <div className="mt-1 text-caption font-bold uppercase tracking-kicker text-muted-foreground">
          {label} <span className="font-mono">{nine.total}</span>
        </div>
      )}
    </div>
  );
}

/**
 * The identity and shape of one round: what was played, when, how it went.
 */
export function RoundDetailHeader({
  courseName,
  dateLabel,
  tee,
  score,
  nines,
  stats,
  counts = {},
  className,
}: RoundDetailHeaderProps) {
  const hasBars = (nines?.front.holes.length ?? 0) > 0 || (nines?.back.holes.length ?? 0) > 0;
  const hasStats = stats?.putts != null || stats?.gir != null;

  return (
    <div data-slot="round-detail-header" className={cn("mb-4", className)}>
      <div className="pb-3.5">
        {dateLabel && (
          <div className="mb-1 text-meta font-bold uppercase tracking-eyebrow text-muted-foreground">
            {dateLabel}
          </div>
        )}
        <PageTitle className="pt-0 leading-display tracking-display">{courseName || "—"}</PageTitle>
        {(tee?.box || tee?.rating) && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {tee.box && <span className="capitalize">{tee.box} tees</span>}
            {tee.rating && (
              <>
                <span className="inline-block size-dot rounded-full bg-current opacity-50" />
                <span>{tee.rating}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-end gap-3.5 border-y border-border py-3.5">
        <div className="flex shrink-0 items-end">
          <div>
            <div className="font-mono text-hero font-bold leading-none tracking-hero text-foreground">
              {score.total || "—"}
            </div>
            {score.toPar != null && (
              <div
                className={cn(
                  "mt-0.5 font-mono text-sm font-bold",
                  // Level par reads as a good thing here, so it shares birdie's green.
                  score.toPar <= 0 ? "text-score-birdie" : "text-score-bogey",
                )}
              >
                {toParDisplay(score.toPar, "-")}
              </div>
            )}
          </div>
          {score.net != null && (
            <>
              <div className="mx-3.5 h-11 w-px shrink-0 bg-border" />
              <div>
                <div className="mb-chip text-caption font-bold uppercase tracking-net text-muted-foreground">
                  Net{score.courseHandicap != null
                    ? ` · hcp ${score.courseHandicap < 0 ? `+${Math.abs(score.courseHandicap)}` : score.courseHandicap}`
                    : ""}
                </div>
                <div className="font-mono text-lg font-bold leading-none text-primary">{score.net}</div>
              </div>
            </>
          )}
        </div>

        {hasBars && nines && (
          <div className="flex min-w-0 flex-1 items-start gap-3.5 overflow-hidden">
            <Nine nine={nines.front} label="Front" />
            <Nine nine={nines.back} label="Back" className="mt-1.5" />
          </div>
        )}
      </div>

      {hasStats && (
        <div className="flex gap-4 pt-2 font-mono text-xs text-muted-foreground">
          {stats?.putts != null && (
            <span>
              <span className="font-semibold text-foreground">{stats.putts}</span> putts
            </span>
          )}
          {stats?.gir != null && (
            <span>
              <span className="font-semibold text-primary">{stats.gir}</span>/18 GIR
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 pt-2.5">
        {CHIPS.map(({ key, noun, plural, absorbs }) => {
          const count = (counts[key] ?? 0) + (absorbs ? counts[absorbs] ?? 0 : 0);
          if (!count) return null;
          const tone = scoreTone(key);
          return (
            <div
              key={key}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-chip"
              style={{ background: tone.fill, color: tone.onFill }}
            >
              <span className="font-mono text-label font-semibold">{count}</span>
              <span className="text-meta font-bold tracking-chip">
                {pluralNoun(count, noun, plural)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
