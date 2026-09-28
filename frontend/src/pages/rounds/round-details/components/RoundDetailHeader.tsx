import { cn } from "@/brand/cn";
import { PageTitle } from "@/brand";
import { colors, toParDisplay, type ScoreKey } from "@/brand/theme";
import { netScore, type Nine, type Round } from "@/domain";
import { formatCourseName } from "@/lib/courseName";
import { pluralNoun } from "@/lib/pluralize";
import { formatRoundDateLong } from "@/lib/roundDate";

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

export interface RoundDetailHeaderProps {
  round: Round;
  /** "72.4 / 130", when the tee is rated. */
  teeRating?: string | null;
  /** The player's handicap on this course. Shows the net score when known. */
  courseHandicap?: number | null;
  className?: string;
}

function NineBars({ nine, label, className }: {
  nine: Nine;
  label: string;
  className?: string;
}) {
  if (nine.holes.length === 0) return null;
  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <div className="flex h-6 items-end gap-hair">
        {nine.holes.map((h) => {
          // Unscored holes read as par.
          const key = h.kind ?? "par";
          return (
            <div
              key={h.hole}
              // Par is the baseline, so it recedes and the misses stand out.
              className={cn("flex-1 rounded-t-tick", key === "par" && "opacity-(--brand-opacity-recessed)")}
              style={{
                height: `${BAR_HEIGHTS[key]}%`,
                background: colors.score[key].base,
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
export function RoundDetailHeader({ round, teeRating, courseHandicap, className }: RoundDetailHeaderProps) {
  const dateLabel = formatRoundDateLong(round.date);
  const net = courseHandicap != null && round.score != null ? netScore(round.score, courseHandicap) : null;
  const counts = round.scoreCounts;

  return (
    <div data-slot="round-detail-header" className={cn("mb-4", className)}>
      <div className="pb-3.5">
        {dateLabel && (
          <div className="mb-1 text-meta font-bold uppercase tracking-eyebrow text-muted-foreground">
            {dateLabel}
          </div>
        )}
        <PageTitle className="pt-0 leading-display tracking-display">
          {formatCourseName(round.course?.name)}
        </PageTitle>
        {(round.teeBox || teeRating) && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {round.teeBox && <span className="capitalize">{round.teeBox} tees</span>}
            {teeRating && (
              <>
                <span className="inline-block size-dot rounded-full bg-current opacity-50" />
                <span>{teeRating}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-end gap-3.5 border-y border-border py-3.5">
        <div className="flex shrink-0 items-end">
          <div>
            <div className="font-mono text-hero font-bold leading-none tracking-hero text-foreground">
              {round.score ?? "—"}
            </div>
            {round.toPar != null && (
              <div
                className={cn(
                  "mt-0.5 font-mono text-sm font-bold",
                  // Level par reads as a good thing here, so it shares birdie's green.
                  round.toPar <= 0 ? "text-score-birdie" : "text-score-bogey",
                )}
              >
                {toParDisplay(round.toPar, "-")}
              </div>
            )}
          </div>
          {courseHandicap != null && net != null && (
            <>
              <div className="mx-3.5 h-11 w-px shrink-0 bg-border" />
              <div>
                <div className="mb-chip text-caption font-bold uppercase tracking-net text-muted-foreground">
                  Net · hcp {courseHandicap < 0 ? `+${Math.abs(courseHandicap)}` : courseHandicap}
                </div>
                <div className="font-mono text-lg font-bold leading-none text-primary">{net}</div>
              </div>
            </>
          )}
        </div>

        {round.holes.length > 0 && (
          <div className="flex min-w-0 flex-1 items-start gap-3.5 overflow-hidden">
            <NineBars nine={round.frontNine} label="Front" />
            <NineBars nine={round.backNine} label="Back" className="mt-1.5" />
          </div>
        )}
      </div>

      {(round.putts != null || round.gir != null) && (
        <div className="flex gap-4 pt-2 font-mono text-xs text-muted-foreground">
          {round.putts != null && (
            <span>
              <span className="font-semibold text-foreground">{round.putts}</span> putts
            </span>
          )}
          {round.gir != null && (
            <span>
              <span className="font-semibold text-primary">{round.gir}</span>/18 GIR
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 pt-2.5">
        {CHIPS.map(({ key, noun, plural, absorbs }) => {
          const count = (counts[key] ?? 0) + (absorbs ? counts[absorbs] ?? 0 : 0);
          if (!count) return null;
          const tone = colors.score[key];
          return (
            <div
              key={key}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-chip"
              style={{ background: tone.base, color: tone.onBase }}
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
