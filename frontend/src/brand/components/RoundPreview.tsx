import { Link2 } from "lucide-react";
import { motion } from "framer-motion";
import { scoreFill, toParColor, toParLabel, useTheme } from "@/brand/theme";
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
  const theme = useTheme();
  const dateParts = parseDateParts(round.date);
  const toParText = toParLabel(round.to_par);
  const holes = round.hole_scores_summary ?? [];

  return (
    <motion.div
      style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
        borderRadius: 10,
        display: "grid",
        gridTemplateColumns: "54px 1fr auto",
        gap: 10,
        alignItems: "center",
        cursor: onClick ? "pointer" : "default",
        overflow: "hidden",
      }}
      whileHover={onClick ? { scale: 1.015, boxShadow: "0 6px 20px rgba(0,0,0,0.08)" } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={onClick}
    >
      <div
        style={{
          background: theme.mutedFill,
          borderRadius: "8px 0 0 8px",
          padding: "10px 0",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          alignSelf: "stretch",
          justifyContent: "center",
        }}
      >
        {dateParts ? (
          <>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: theme.fgMuted }}>
              {dateParts.month}
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: theme.fg, lineHeight: 1 }}>
              {dateParts.day}
            </span>
            <span style={{ fontSize: 9, color: theme.fgMuted }}>{dateParts.year}</span>
          </>
        ) : (
          <span style={{ fontSize: 9, color: theme.fgMuted }}>—</span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 0", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.3px",
              color: theme.fg,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
              flex: 1,
            }}
          >
            {round.course_name ? formatCourseName(round.course_name) : "Unknown course"}
          </span>
          {!round.course_id && onLinkClick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLinkClick();
              }}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: theme.fgMuted,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Link2 size={11} />
            </button>
          )}
        </div>

        <div style={{ fontSize: 10, color: theme.fgMuted, display: "flex", gap: 8, alignItems: "center" }}>
          {round.front_nine != null && round.back_nine != null && (
            <span>
              <strong style={{ color: theme.fg, fontWeight: 700 }}>
                {round.front_nine}·{round.back_nine}
              </strong>
            </span>
          )}
          {round.total_putts != null && (
            <span>
              <strong style={{ color: theme.fg, fontWeight: 700 }}>{round.total_putts}</strong> putts
            </span>
          )}
          {round.tee_box && <span>{round.tee_box}</span>}
        </div>

        {holes.length > 0 && (
          <div style={{ display: "flex", gap: 1.5, marginTop: 4, height: 10 }}>
            {holes.map((h) => {
              const fill = scoreFill(h.s, h.p);
              const isPar = h.s == null || h.p == null || h.s === h.p;
              return (
                <div
                  key={h.h}
                  style={{
                    flex: 1,
                    borderRadius: 1.5,
                    background: fill,
                    opacity: isPar ? 0.35 : 1,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          textAlign: "right",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 2,
          paddingRight: 14,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.8px", lineHeight: 1, color: theme.fg }}>
          {round.total_score ?? "—"}
        </span>
        {toParText && (
          <span style={{ fontSize: 10, fontWeight: 700, color: toParColor(round.to_par, theme.fgMuted) }}>
            {toParText}
          </span>
        )}
      </div>
    </motion.div>
  );
}
