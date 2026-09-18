import { Link2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/brand/cn";
import { motion as motionTokens, scoreFill, toParBadgeClass, toParLabel, toParTextClass } from "@/brand/theme";
import { formatCourseName } from "@/lib/courseName";
import { formatRoundDateHistory, roundDateParts } from "@/lib/roundDate";
import type { RoundSummary } from "@/types/golf";

interface RoundPreviewProps {
  round: RoundSummary;
  variant?: "history";
  onClick?: () => void;
  onLinkClick?: () => void;
}

export function RoundPreview({ round, variant, onClick, onLinkClick }: RoundPreviewProps) {
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
          <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", toParBadgeClass(round.to_par))}>
            {toParLabel(round.to_par) ?? "—"}
          </span>
        </div>
      </div>
    );
  }

  const dateParts = roundDateParts(round.date);
  const toParText = toParLabel(round.to_par);
  const holes = round.hole_scores_summary ?? [];

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

        {holes.length > 0 && (
          <div className="mt-1 flex h-2.5 gap-bar">
            {holes.map((h) => {
              const isPar = h.s == null || h.p == null || h.s === h.p;
              return (
                <div
                  key={h.h}
                  className={cn("flex-1 rounded-bar", isPar && "opacity-(--brand-opacity-recessed)")}
                  style={{ background: scoreFill(h.s, h.p) }}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-0.5 whitespace-nowrap pr-3.5 text-right">
        <span className="text-2xl font-bold leading-none tracking-stat text-foreground">
          {round.total_score ?? "—"}
        </span>
        {toParText && (
          <span className={cn("text-meta font-bold", toParTextClass(round.to_par))}>
            {toParText}
          </span>
        )}
      </div>
    </motion.div>
  );
}
