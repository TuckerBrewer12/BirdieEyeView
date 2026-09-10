import { Link2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/brand/cn";
import { scoreFill, toParLabel, toParTextClass } from "@/brand/theme";
import { formatCourseName } from "@/lib/courseName";
import type { RoundSummary } from "@/types/golf";

interface RoundPreviewProps {
  round: RoundSummary;
  onClick?: () => void;
  onLinkClick?: () => void;
}

function parseDateParts(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: String(d.getDate()),
    year: `'${String(d.getFullYear()).slice(2)}`,
  };
}

export function RoundPreview({ round, onClick, onLinkClick }: RoundPreviewProps) {
  const dateParts = parseDateParts(round.date);
  const toParText = toParLabel(round.to_par);
  const holes = round.hole_scores_summary ?? [];

  return (
    <motion.div
      data-slot="round-preview"
      className={cn(
        "grid grid-cols-[54px_1fr_auto] items-center gap-2.5 overflow-hidden rounded-[10px] border border-border bg-card transition-shadow",
        onClick ? "cursor-pointer hover:shadow-card" : "cursor-default",
      )}
      whileHover={onClick ? { scale: 1.015 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={onClick}
    >
      <div className="flex flex-col items-center justify-center gap-0.5 self-stretch rounded-l-lg bg-muted py-2.5 text-center">
        {dateParts ? (
          <>
            <span className="text-[9px] font-bold uppercase tracking-[1px] text-muted-foreground">
              {dateParts.month}
            </span>
            <span className="text-[18px] font-bold leading-none text-foreground">
              {dateParts.day}
            </span>
            <span className="text-[9px] text-muted-foreground">{dateParts.year}</span>
          </>
        ) : (
          <span className="text-[9px] text-muted-foreground">—</span>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-0.5 py-2.5">
        <div className="flex min-w-0 items-center gap-[5px]">
          <span className="min-w-0 flex-1 truncate text-base font-bold tracking-[-0.3px] text-foreground">
            {round.course_name ? formatCourseName(round.course_name) : "Unknown course"}
          </span>
          {!round.course_id && onLinkClick && (
            <button
              type="button"
              aria-label="Link this round to a course"
              onClick={(e) => {
                e.stopPropagation();
                onLinkClick();
              }}
              className="flex shrink-0 items-center border-none bg-transparent p-0 text-muted-foreground hover:text-foreground"
            >
              <Link2 size={11} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
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
          <div className="mt-1 flex h-2.5 gap-[1.5px]">
            {holes.map((h) => {
              const isPar = h.s == null || h.p == null || h.s === h.p;
              return (
                <div
                  key={h.h}
                  className={cn("flex-1 rounded-[1.5px]", isPar && "opacity-35")}
                  style={{ background: scoreFill(h.s, h.p) }}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-0.5 whitespace-nowrap pr-3.5 text-right">
        <span className="text-2xl font-bold leading-none tracking-[-0.8px] text-foreground">
          {round.total_score ?? "—"}
        </span>
        {toParText && (
          <span className={cn("text-[10px] font-bold", toParTextClass(round.to_par))}>
            {toParText}
          </span>
        )}
      </div>
    </motion.div>
  );
}
