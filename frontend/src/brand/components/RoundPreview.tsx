import { Link2, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/brand/cn";
import { HoleScoreBars } from "@/brand/charts/HoleScoreBars";
import { HoleScoreShapes } from "@/brand/charts/HoleScoreShapes";
import { motion as motionTokens, toParBadgeClass, toParLabel, toParTextClass } from "@/brand/theme";
import { summaryHoles, summaryToPar } from "@/domain";
import { formatCourseName } from "@/lib/courseName";
import { formatRoundDateHistory, formatRoundDateShort, roundDateParts } from "@/lib/roundDate";
import type { RoundSummary } from "@/types/golf";

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

type RoundPreviewProps = RoundListProps | RoundHighlightProps;

export function RoundPreview(props: RoundPreviewProps) {
  if (props.variant === "highlight") {
    return <RoundHighlight round={props.round} onClick={props.onClick} />;
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
          {formatRoundDateHistory(round.date) ?? "—"}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-foreground">{round.total_score ?? "—"}</span>
          <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", toParBadgeClass(summaryToPar(round)))}>
            {toParLabel(summaryToPar(round)) ?? "—"}
          </span>
        </div>
      </div>
    );
  }

  const dateParts = roundDateParts(round.date);
  const toPar = summaryToPar(round);
  const toParText = toParLabel(toPar);
  const holes = summaryHoles(round);

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
            {round.course_name ? formatCourseName(round.course_name) : "Unknown course"}
          </span>
          {!round.course_id && onLinkClick && (
            <button
              type="button"
              aria-label={`Link ${round.course_name ? formatCourseName(round.course_name) : "this round"} to a saved course`}
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
          {round.front_nine != null && round.back_nine != null && (
            <span>
              <strong className="font-bold text-foreground">
                {round.front_nine}·{round.back_nine}
              </strong>
            </span>
          )}
          {round.total_putts != null && (
            <span>
              <strong className="font-bold text-foreground">{round.total_putts}</strong> putts
            </span>
          )}
          {round.tee_box && <span>{round.tee_box}</span>}
        </div>

        <HoleScoreBars holes={holes} className="mt-1" />
      </div>

      <div className="flex flex-col items-end gap-0.5 whitespace-nowrap pr-3.5 text-right">
        <span className="text-2xl font-bold leading-none tracking-stat text-foreground">
          {round.total_score ?? "—"}
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

  const dateLabel = formatRoundDateShort(round.date);
  const toPar = summaryToPar(round);
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
            {round.course_name ? formatCourseName(round.course_name) : "Unknown course"}
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
        <HoleScoreShapes holes={summaryHoles(round)} />
      </div>

      <div className="shrink-0 text-right">
        <div className="text-4xl font-black tracking-tighter text-card-foreground transition-colors group-hover:text-primary">
          {round.total_score ?? "—"}
        </div>
      </div>
    </button>
  );
}
