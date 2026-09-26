import { Link2, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/brand/cn";
import { HoleScoreBars } from "@/brand/charts/HoleScoreBars";
import { HoleScoreShapes } from "@/brand/charts/HoleScoreShapes";
import { motion as motionTokens, toParBadgeClass, toParLabel, toParTextClass } from "@/brand/theme";
import {
  backNine,
  frontNine,
  nineTotal,
  roundPutts,
  roundScore,
  roundToPar,
  type Round,
} from "@/domain";
import { formatCourseName } from "@/lib/courseName";
import { formatRoundDateHistory, formatRoundDateShort, roundDateParts } from "@/lib/roundDate";

interface RoundListProps {
  round: Round;
  variant?: undefined;
  onClick?: () => void;
  onLinkClick?: () => void;
}

/** A score line in a history list. Takes the figures, since history rows carry no hole scores. */
interface RoundHistoryProps {
  variant: "history";
  date: string | null;
  score: number | null;
  toPar: number | null;
  onClick?: () => void;
}

interface RoundHighlightProps {
  /** Null while the player has no round to celebrate yet. */
  round: Round | null;
  variant: "highlight";
  onClick?: () => void;
}

type RoundPreviewProps = RoundListProps | RoundHistoryProps | RoundHighlightProps;

export function RoundPreview(props: RoundPreviewProps) {
  if (props.variant === "highlight") {
    return <RoundHighlight round={props.round} onClick={props.onClick} />;
  }

  if (props.variant === "history") {
    const { date, score, toPar, onClick } = props;
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
          {formatRoundDateHistory(date) ?? "—"}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-foreground">{score ?? "—"}</span>
          <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", toParBadgeClass(toPar))}>
            {toParLabel(toPar) ?? "—"}
          </span>
        </div>
      </div>
    );
  }

  const { round, onClick, onLinkClick } = props;
  const score = roundScore(round);
  const toPar = roundToPar(round);
  const dateParts = roundDateParts(round.date);
  const toParText = toParLabel(toPar);
  const front = nineTotal(frontNine(round.holes));
  const back = nineTotal(backNine(round.holes));
  const putts = roundPutts(round);
  const courseName = round.course?.name ? formatCourseName(round.course.name) : null;

  return (
    <motion.div
      data-slot="round-preview"
      className={cn(
        "grid grid-cols-round-preview items-center gap-2.5 overflow-hidden rounded-card border border-border bg-card transition-shadow",
        onClick ? "cursor-pointer hover:shadow-card" : "cursor-default",
      )}
      whileHover={onClick ? { scale: motionTokens.hoverScale } : undefined}
      whileTap={onClick ? { scale: motionTokens.tapScale } : undefined}
      transition={motionTokens.spring}
      onClick={onClick}
    >
      <div className="flex flex-col items-center justify-center gap-0.5 self-stretch rounded-l-lg bg-muted py-2.5 text-center">
        {dateParts ? (
          <>
            <span className="text-caption font-bold uppercase tracking-kicker text-muted-foreground">
              {dateParts.month}
            </span>
            <span className="text-lg font-bold leading-none text-foreground">
              {dateParts.day}
            </span>
            <span className="text-caption text-muted-foreground">{dateParts.year}</span>
          </>
        ) : (
          <span className="text-caption text-muted-foreground">—</span>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-0.5 py-2.5">
        <div className="flex min-w-0 items-center gap-tight">
          <span className="min-w-0 flex-1 truncate text-base font-bold tracking-name text-foreground">
            {courseName ?? "Unknown course"}
          </span>
          {!round.course?.id && onLinkClick && (
            <button
              type="button"
              aria-label={`Link ${courseName ?? "this round"} to a saved course`}
              onClick={(e) => {
                e.stopPropagation();
                onLinkClick();
              }}
              className="flex shrink-0 items-center border-none bg-transparent p-0 text-muted-foreground hover:text-foreground"
            >
              <Link2 className="size-icon-xs" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-meta text-muted-foreground">
          {front != null && back != null && (
            <span>
              <strong className="font-bold text-foreground">
                {front}·{back}
              </strong>
            </span>
          )}
          {putts != null && (
            <span>
              <strong className="font-bold text-foreground">{putts}</strong> putts
            </span>
          )}
          {round.teeBox && <span>{round.teeBox}</span>}
        </div>

        <HoleScoreBars holes={round.holes} className="mt-1" />
      </div>

      <div className="flex flex-col items-end gap-0.5 whitespace-nowrap pr-3.5 text-right">
        <span className="text-2xl font-bold leading-none tracking-stat text-foreground">
          {score ?? "—"}
        </span>
        {toParText && (
          <span className={cn("text-meta font-bold", toParTextClass(toPar))}>
            {toParText}
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
  round: Round | null;
  onClick?: () => void;
}) {
  if (!round) {
    return (
      <div data-slot="round-preview" className="p-4 text-center text-sm text-muted-foreground">
        Play a round to unlock highlights!
      </div>
    );
  }

  const dateLabel = formatRoundDateShort(round.date);
  const toPar = roundToPar(round);
  const toParText = toParLabel(toPar);

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
            {dateLabel ?? "—"}
            {toParText && (
              <>
                {" · "}
                <span className={cn("font-semibold", toParTextClass(toPar))}>{toParText}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 overflow-x-auto">
        <HoleScoreShapes holes={round.holes} />
      </div>

      <div className="shrink-0 text-right">
        <div className="text-4xl font-black tracking-tighter text-card-foreground transition-colors group-hover:text-primary">
          {roundScore(round) ?? "—"}
        </div>
      </div>
    </button>
  );
}
