import { ChevronRight, Trophy } from "lucide-react";
import { cn } from "@/brand/cn";
import { EmptyNote } from "./EmptyNote";
import { HoleScoreBars } from "@/brand/charts/HoleScoreBars";
import { HoleScoreShapes } from "@/brand/charts/HoleScoreShapes";
import { Button, RowButton } from "@/brand/components/Button";
import { StatValue } from "@/brand/components/Stat";
import { ToParPill } from "@/brand/components/ToParPill";
import { toParLabel, toParTextClass } from "@/brand/theme";
import { roundDayAndTee, type RoundSummary } from "@/domain";
import { courseLabel } from "@/domain/course";
import { formatDay, formatDayShort, dayParts } from "@/domain/date";

interface RoundListProps {
  round: RoundSummary;
  /** Default is the dated row; `history` a round at a course the page already names: its day, its holes, its score. */
  variant?: "history";
  onClick?: () => void;
  onLinkClick?: () => void;
}

interface RoundHighlightProps {
  /** Null while the player has no round to celebrate yet. */
  round: RoundSummary | null;
  variant: "highlight";
  onClick?: () => void;
}

interface RoundCompactProps {
  round: RoundSummary;
  /** A row in a card's list of rounds: the date, the course, a strip of the holes, the score. */
  variant: "compact";
  /** `stacked` is the phone's: the date under the course, and no strip. */
  layout?: "inline" | "stacked";
  onClick?: () => void;
}

interface RoundSummaryProps {
  round: RoundSummary;
  /**
   * A round on its own, in a box of its own: the course with its day and tee, the score and its
   * pill, and the two nines as pills under them. The scan's saved screen shows the round this way.
   */
  variant: "summary";
  /** `nines` (the default): two nines of pills. `strip`: one thin cell a hole, for a small card. */
  holes?: "nines" | "strip";
  /** `outline` (the default): its own bordered box. `none`: no box, for a `Card` that already frames it. */
  frame?: "outline" | "none";
}

type RoundPreviewProps = RoundListProps | RoundHighlightProps | RoundCompactProps | RoundSummaryProps;

export function RoundPreview(props: RoundPreviewProps) {
  if (props.variant === "highlight") {
    return <RoundHighlight round={props.round} onClick={props.onClick} />;
  }
  if (props.variant === "compact") {
    return <RoundCompact {...props} />;
  }
  if (props.variant === "summary") {
    return <RoundSummaryBox round={props.round} holes={props.holes} frame={props.frame} />;
  }

  const { round, variant, onClick, onLinkClick } = props;

  if (variant === "history") {
    // One of the golfer's rounds at a course: the day over a cell per hole, then the score and its to-par.
    return (
      <RowButton
        data-slot="round-preview"
        data-variant="history"
        onClick={onClick}
        disabled={!onClick}
        className={cn(
          "flex w-full items-center gap-3 px-3.5 py-3 text-left md:gap-4 md:px-5",
          onClick ? "cursor-pointer hover:bg-muted/half" : "cursor-default",
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-body font-semibold text-foreground md:text-body-sm">{formatDay(round.date) ?? "—"}</span>
          {round.holes.length > 0 && (
            <HoleScoreBars holes={round.holes} variant="strip" className="w-full md:max-w-70" />
          )}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1 md:flex-row md:items-center md:gap-4">
          <span className="text-xl leading-none font-bold text-foreground md:text-title">{round.score ?? "—"}</span>
          <ToParPill toPar={round.toPar} size="row" ground="muted" />
        </span>
      </RowButton>
    );
  }

  const dateParts = dayParts(round.date);
  const courseName = courseLabel(round.course?.name);
  const unlinked = !round.course?.id;
  const meta = [
    round.frontNine.total != null && round.backNine.total != null
      ? `${round.frontNine.total} · ${round.backNine.total}`
      : null,
    round.putts != null ? `${round.putts} putts` : null,
    round.teeBox,
  ].filter(Boolean);

  // The course name is the row's one button; its ::after stretches over the whole row, so the row
  // opens from anywhere while "Link" stays a button of its own above it.
  return (
    <div
      data-slot="round-preview"
      className="relative flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-muted/half md:gap-4 md:px-5 md:py-3.5"
    >
      <div className="flex w-8 shrink-0 flex-col items-center text-center md:w-9">
        {dateParts ? (
          <>
            <span className="text-meta font-semibold uppercase tracking-chip text-muted-foreground">
              {dateParts.month}
            </span>
            <span className="text-lg leading-tight font-bold text-foreground md:text-xl">{dateParts.day}</span>
          </>
        ) : (
          <span className="text-label text-muted-foreground">—</span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 flex-col gap-1 md:flex-row md:flex-wrap md:items-baseline md:gap-x-2.5 md:gap-y-1">
          <RowButton
            onClick={onClick}
            disabled={!onClick}
            className={cn(
              "min-w-0 max-w-full truncate text-body-lg font-semibold text-foreground outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset",
              onClick ? "cursor-pointer" : "cursor-default",
            )}
          >
            <span>{courseName}</span>
          </RowButton>
          {(meta.length > 0 || unlinked) && (
            <span className="text-body-sm text-muted-foreground">
              {meta.join(" · ")}
              {unlinked && onLinkClick && (
                <span className="relative z-10">
                  {meta.length > 0 && " · "}
                  Not linked ·{" "}
                  <Button
                    variant="link"
                    size="xs"
                    className="h-auto p-0 text-body-sm font-semibold underline underline-offset-3"
                    aria-label={`Link ${courseName} to a saved course`}
                    onClick={onLinkClick}
                  >
                    Link
                  </Button>
                </span>
              )}
            </span>
          )}
        </div>
        {round.holes.length > 0 && (
          <HoleScoreBars holes={round.holes} variant="strip" className="w-full md:max-w-115" />
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 md:flex-row md:items-center md:gap-4">
        <span className="text-name leading-none font-bold text-foreground md:text-title">{round.score ?? "—"}</span>
        <ToParPill toPar={round.toPar} size="row" ground="muted" />
      </div>
      <ChevronRight aria-hidden className="hidden size-3.5 shrink-0 text-muted-foreground md:block" />
    </div>
  );
}

/** The round worth showing off: the trophy, the marked card, the number. */
function RoundHighlight({
  round,
  onClick,
}: {
  round: RoundSummary | null;
  onClick?: () => void;
}) {
  if (!round) {
    return (
      <EmptyNote data-slot="round-preview" className="p-4">
        Play a round to unlock highlights!
      </EmptyNote>
    );
  }

  return (
    <button
      type="button"
      data-slot="round-preview"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "group flex w-full flex-wrap items-center gap-4 text-left",
        onClick ? "cursor-pointer" : "cursor-default",
      )}
    >
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full border border-score-eagle/recessed bg-score-eagle/tint text-score-eagle">
          <Trophy className="size-5" />
        </div>
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-eyebrow text-muted-foreground">
            Best Recent Round
          </div>
          <div className="font-bold leading-tight text-card-foreground transition-colors group-hover:text-primary">
            {courseLabel(round.course?.name)}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {formatDayShort(round.date) ?? "—"}
            {round.toPar != null && (
              <>
                {" · "}
                <span className={cn("font-semibold", toParTextClass(round.toPar))}>{toParLabel(round.toPar)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 overflow-x-auto">
        <HoleScoreShapes round={round} />
      </div>

      <div className="shrink-0 text-right">
        <div className="text-figure-lg font-black tracking-tighter text-card-foreground transition-colors group-hover:text-primary">
          {round.score ?? "—"}
        </div>
      </div>
    </button>
  );
}

/**
 * A round as one row of a card's list of rounds: when, where, a cell per hole coloured by how it
 * went, and the score with its to-par. On a phone the date goes under the course and the cells go.
 */
function RoundCompact({ round, layout = "inline", onClick }: Omit<RoundCompactProps, "variant">) {
  const stacked = layout === "stacked";
  const courseName = courseLabel(round.course?.name);
  const date = formatDayShort(round.date) ?? "—";

  return (
    <RowButton
      data-slot="round-preview"
      data-variant="compact"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "w-full items-center rounded-2xl",
        stacked ? "flex gap-3 px-3 py-3" : "grid grid-cols-round-row gap-4 px-3.5 py-3",
        onClick ? "cursor-pointer hover:bg-muted/half" : "cursor-default",
      )}
    >
      {stacked ? (
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body-lg font-semibold text-foreground">{courseName}</span>
          <span className="text-body-sm text-muted-foreground">{date}</span>
        </span>
      ) : (
        <>
          <span className="text-body text-muted-foreground">{date}</span>
          <span className="min-w-0 truncate text-body-lg font-semibold text-foreground">{courseName}</span>
          <span>{round.holes.length > 0 && <HoleScoreBars holes={round.holes} variant="strip" size="sm" />}</span>
        </>
      )}
      <span className={cn("shrink-0 text-xl font-semibold text-foreground", !stacked && "text-right")}>
        {round.score ?? "—"}
      </span>
      <ToParPill toPar={round.toPar} size="row" />
    </RowButton>
  );
}

function RoundSummaryBox({
  round,
  holes = "nines",
  frame = "outline",
}: Pick<RoundSummaryProps, "round" | "holes" | "frame">) {
  const when = roundDayAndTee(round);
  return (
    <div
      data-slot="round-preview"
      data-variant="summary"
      className={cn("flex flex-col gap-3", frame === "outline" && "rounded-xl border border-border p-4")}
    >
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-body-lg font-semibold text-foreground">{courseLabel(round.course?.name)}</p>
          {when && <p className="mt-0.5 text-body-sm text-muted-foreground">{when}</p>}
        </div>
        <div className="flex items-baseline gap-1.5">
          <StatValue size="lg">{round.score ?? "—"}</StatValue>
          <ToParPill toPar={round.toPar} ground="muted" />
        </div>
      </div>
      {holes === "strip" ? (
        <HoleScoreBars holes={round.holes} variant="strip" className="w-full" />
      ) : (
        <div className="flex gap-2">
          <HoleScoreBars holes={round.frontNine.holes} size="sm" className="flex-1" />
          <HoleScoreBars holes={round.backNine.holes} size="sm" className="flex-1" />
        </div>
      )}
    </div>
  );
}
