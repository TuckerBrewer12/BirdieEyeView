import { ChevronRight, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/brand/cn";
import { HoleScoreBars } from "@/brand/charts/HoleScoreBars";
import { HoleScoreShapes } from "@/brand/charts/HoleScoreShapes";
import { NineBars } from "@/brand/charts/NineBars";
import { Button } from "@/brand/components/Button";
import { ScoreCountChip } from "@/brand/components/ScoreCountChip";
import { ToParFigure } from "@/brand/components/ToParFigure";
import { toParBadgeClass, toParLabel, toParTextClass, tokens } from "@/brand/theme";
import { playedScoreKinds, scoreKindCountLabel, type RoundSummary } from "@/domain";
import { formatCourseName } from "@/domain/course";
import { formatDay, formatDayShort, dayParts } from "@/domain/date";

interface RoundListProps {
  round: RoundSummary;
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

interface RoundTicketProps {
  round: RoundSummary;
  variant: "ticket";
  /** The eyebrow over the course name, worded by the screen: "Last Round". */
  label: string;
  /** Shown with a chevron when the ticket opens the round, like "Open card". */
  actionLabel?: string;
  onClick?: () => void;
}

type RoundPreviewProps = RoundListProps | RoundHighlightProps | RoundTicketProps;

export function RoundPreview(props: RoundPreviewProps) {
  if (props.variant === "highlight") {
    return <RoundHighlight round={props.round} onClick={props.onClick} />;
  }
  if (props.variant === "ticket") {
    return <RoundTicket {...props} />;
  }

  const { round, variant, onClick, onLinkClick } = props;

  if (variant === "history") {
    return (
      <div
        data-slot="round-preview"
        className={cn(
          "flex items-center justify-between px-5 py-3",
          onClick && "cursor-pointer hover:bg-muted",
        )}
        onClick={onClick}
      >
        <span className="text-sm text-muted-foreground">
          {formatDay(round.date) ?? "—"}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-foreground">{round.score ?? "—"}</span>
          <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", toParBadgeClass(round.toPar))}>
            {toParLabel(round.toPar) ?? "—"}
          </span>
        </div>
      </div>
    );
  }

  const dateParts = dayParts(round.date);
  const courseName = round.course?.name ? formatCourseName(round.course.name) : null;
  const unlinked = !round.course?.id;
  const nines =
    round.frontNine.total != null && round.backNine.total != null
      ? `${round.frontNine.total} – ${round.backNine.total}`
      : null;
  const meta = [
    round.teeBox ? `${round.teeBox} tees` : null,
    nines,
    round.putts != null ? `${round.putts} putts` : null,
  ].filter(Boolean);

  return (
    <motion.div
      data-slot="round-preview"
      className={cn(
        "flex items-stretch gap-4 rounded-row border border-border bg-card px-4 py-3.5 transition-shadow",
        onClick ? "cursor-pointer hover:shadow-card" : "cursor-default",
      )}
      whileHover={onClick ? { scale: tokens.motion.hoverScale } : undefined}
      whileTap={onClick ? { scale: tokens.motion.tapScale } : undefined}
      transition={tokens.motion.spring}
      onClick={onClick}
    >
      <div className="box-content flex w-11 shrink-0 flex-col items-center justify-center border-r border-border pr-4 text-center">
        {dateParts ? (
          <>
            <span className="text-label font-semibold uppercase tracking-chip text-muted-foreground">
              {dateParts.month}
            </span>
            <span className="text-date text-foreground">{dateParts.day}</span>
          </>
        ) : (
          <span className="text-label text-muted-foreground">—</span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-base font-semibold text-foreground">
            {courseName ?? "Unknown course"}
          </span>
          {unlinked && (
            <Button
              variant="outline"
              size="xs"
              shape="pill"
              aria-label={onLinkClick ? `Link ${courseName ?? "this round"} to a saved course` : undefined}
              disabled={!onLinkClick}
              onClick={(e) => {
                e.stopPropagation();
                onLinkClick?.();
              }}
              className="text-muted-foreground disabled:opacity-100"
            >
              Unlinked
            </Button>
          )}
        </div>

        {meta.length > 0 && <div className="text-body-sm text-foreground-secondary">{meta.join(" · ")}</div>}

        {round.holes.length > 0 && (
          <div className="flex gap-2.5">
            <NineBars holes={round.holes.slice(0, 9)} />
            <NineBars holes={round.holes.slice(9)} />
          </div>
        )}
      </div>

      <div className="flex w-16 shrink-0 flex-col items-end justify-center gap-1 whitespace-nowrap text-right">
        <span className="text-figure text-foreground">{round.score ?? "—"}</span>
        {round.toPar != null && (
          <span className={cn("rounded-full px-2 py-0.5 text-body-sm font-semibold", toParBadgeClass(round.toPar))}>
            {toParLabel(round.toPar)}
          </span>
        )}
      </div>
    </motion.div>
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
      <div data-slot="round-preview" className="p-4 text-center text-sm text-muted-foreground">
        Play a round to unlock highlights!
      </div>
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
        <div className="flex size-12 items-center justify-center rounded-full border border-score-eagle/30 bg-score-eagle/15 text-score-eagle">
          <Trophy className="size-5" />
        </div>
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-eyebrow text-muted-foreground">
            Best Recent Round
          </div>
          <div className="font-bold leading-tight text-card-foreground transition-colors group-hover:text-primary">
            {round.course?.name ? formatCourseName(round.course.name) : "Unknown course"}
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
        <div className="text-4xl font-black tracking-tighter text-card-foreground transition-colors group-hover:text-primary">
          {round.score ?? "—"}
        </div>
      </div>
    </button>
  );
}

/**
 * A round as a ticket: where and when, the number, a bar per hole and what it held.
 * The screen words the eyebrow and the action, so the kit holds only the layout.
 */
function RoundTicket({ round, label, actionLabel, onClick }: Omit<RoundTicketProps, "variant">) {
  const courseName = round.course?.name ? formatCourseName(round.course.name) : "Unknown course";
  const kinds = playedScoreKinds(round.scoreCounts);

  return (
    <button
      type="button"
      data-slot="round-preview"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "group flex w-full flex-col gap-3.5 rounded-card border border-border bg-card p-4 text-left",
        onClick ? "cursor-pointer" : "cursor-default",
      )}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-eyebrow uppercase text-muted-foreground">
            {label}
          </div>
          <div className="truncate text-lg font-bold leading-tight tracking-name text-card-foreground">
            {courseName}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{formatDayShort(round.date) ?? "—"}</span>
            {round.teeBox && (
              <>
                <span aria-hidden className="size-1 rounded-full bg-current opacity-50" />
                <span>{round.teeBox}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-4xl font-semibold leading-none tracking-stat text-card-foreground">
            {round.score ?? "—"}
          </span>
          <ToParFigure toPar={round.toPar} />
        </div>
      </div>

      {round.holes.length > 0 && (
        <div className="w-full">
          <HoleScoreBars holes={round.holes} variant="profile" />
          <div className="mt-1 flex justify-between text-caption text-muted-foreground">
            <span>1</span>
            <span>{Math.ceil(round.holes.length / 2)}</span>
            <span>{round.holes.length}</span>
          </div>
        </div>
      )}

      <div className="flex w-full items-center justify-between gap-3 border-t border-dashed border-border pt-3">
        <div className="flex flex-wrap gap-1.5">
          {kinds.map(({ kind, count }) => (
            <ScoreCountChip key={kind} kind={kind} count={count}>
              {scoreKindCountLabel(kind, count)}
            </ScoreCountChip>
          ))}
        </div>
        {onClick && actionLabel && (
          <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary group-hover:underline">
            {actionLabel}
            <ChevronRight aria-hidden className="size-icon-xs" />
          </span>
        )}
      </div>
    </button>
  );
}
