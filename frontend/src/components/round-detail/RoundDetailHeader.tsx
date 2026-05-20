import { useMemo } from "react";
import { ChevronLeft, Share2, Pencil, Trash2 } from "lucide-react";
import { scoreChartColor } from "@/lib/colors";
import { getStoredColorBlindMode } from "@/lib/accessibility";
import { getColorBlindPalette } from "@/lib/chartPalettes";
import { formatToPar } from "@/types/golf";
import type { Round, Tee } from "@/types/golf";
import { useRoundHoles } from "@/components/round-detail/RoundStory";

// ─── Design tokens ────────────────────────────────────────────────────────────
const INK     = "#131613";
const MUTED   = "#6b7765";
const LINE    = "#e4e9e1";
const PRIMARY = "#2d7a3a";
const SANS    = '"DM Sans", system-ui, sans-serif';
const MONO    = '"DM Mono", monospace';

// ─── Bar strip ────────────────────────────────────────────────────────────────
type BarKey = "birdie" | "par" | "bogey" | "double_bogey" | "triple_bogey";

function barKey(toPar: number): BarKey {
  if (toPar <= -1) return "birdie";
  if (toPar === 0) return "par";
  if (toPar === 1) return "bogey";
  if (toPar === 2) return "double_bogey";
  return "triple_bogey";
}

const BAR_HEIGHTS: Record<BarKey, number> = {
  birdie: 40, par: 52, bogey: 72, double_bogey: 92, triple_bogey: 100,
};

// ─── Chip definitions ─────────────────────────────────────────────────────────
const CHIP_DEFS = [
  { key: "birdie",       label: "Birdies",  bg: "#059669", text: "#fff" },
  { key: "par",          label: "Pars",     bg: "#9ca3af", text: "#fff" },
  { key: "bogey",        label: "Bogeys",   bg: "#f87171", text: "#fff" },
  { key: "double_bogey", label: "Doubles",  bg: "#60a5fa", text: "#fff" },
  { key: "triple_plus",  label: "Triples+", bg: "#a78bfa", text: "#fff" },
  { key: "eagle",        label: "Eagles",   bg: "#f59e0b", text: "#fff" },
] as const;

// ─── Props ────────────────────────────────────────────────────────────────────
export interface RoundDetailHeaderProps {
  round: Round;
  courseName: string;
  totalScore: number;
  toPar: number | null;
  netScore: number | null;
  courseHandicap: number | null;
  tee: Tee | null;
  editMode: boolean;
  saving: boolean;
  confirmDelete: boolean;
  deleting: boolean;
  sharing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onBack: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function RoundDetailHeader({
  round,
  courseName,
  totalScore,
  toPar,
  netScore,
  courseHandicap,
  tee,
  editMode,
  saving,
  confirmDelete,
  deleting,
  sharing,
  onEdit,
  onSave,
  onCancelEdit,
  onShare,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  onBack,
}: RoundDetailHeaderProps) {
  const colorBlindMode = useMemo(() => getStoredColorBlindMode(), []);
  const palette = useMemo(() => getColorBlindPalette(colorBlindMode), [colorBlindMode]);

  const holes = useRoundHoles(round);
  const frontHoles = useMemo(() => holes.filter((h) => h.hole <= 9), [holes]);
  const backHoles  = useMemo(() => holes.filter((h) => h.hole >= 10), [holes]);

  const front9Score = useMemo(
    () => (frontHoles.length > 0 ? frontHoles.reduce((s, h) => s + h.strokes, 0) : null),
    [frontHoles],
  );
  const back9Score = useMemo(
    () => (backHoles.length > 0 ? backHoles.reduce((s, h) => s + h.strokes, 0) : null),
    [backHoles],
  );

  const chipCounts = useMemo(() => {
    const counts: Record<string, number> = {
      eagle: 0, birdie: 0, par: 0, bogey: 0, double_bogey: 0, triple_plus: 0,
    };
    for (const h of holes) {
      if (h.toPar <= -2)      counts.eagle++;
      else if (h.toPar === -1) counts.birdie++;
      else if (h.toPar === 0)  counts.par++;
      else if (h.toPar === 1)  counts.bogey++;
      else if (h.toPar === 2)  counts.double_bogey++;
      else                     counts.triple_plus++;
    }
    return counts;
  }, [holes]);

  const dateEyebrow = useMemo(() => {
    if (!round.date) return null;
    const d = new Date(round.date);
    const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
    const monthDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${weekday} · ${monthDay} · ${d.getFullYear()}`;
  }, [round.date]);

  const btnBase: React.CSSProperties = {
    width: 32, height: 32, borderRadius: "50%",
    background: "#fff", border: `1px solid ${LINE}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", flexShrink: 0, padding: 0,
  };

  return (
    <div style={{ fontFamily: SANS, marginBottom: 16 }}>

      {/* ── Section 1: Action Row ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0 12px" }}>
        <button
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: 0, color: MUTED, fontSize: 13, fontWeight: 500, fontFamily: SANS }}
        >
          <ChevronLeft size={16} color={MUTED} />
          Rounds
        </button>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {editMode ? (
            <>
              <button
                onClick={onSave}
                disabled={saving}
                style={{ padding: "6px 14px", borderRadius: 8, background: PRIMARY, color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: SANS }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={onCancelEdit}
                style={{ padding: "6px 14px", borderRadius: 8, background: "#fff", color: INK, fontSize: 13, fontWeight: 500, border: `1px solid ${LINE}`, cursor: "pointer", fontFamily: SANS }}
              >
                Cancel
              </button>
            </>
          ) : confirmDelete ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.3)", borderRadius: 10 }}>
              <span style={{ fontSize: 13, color: "#b91c1c", fontWeight: 500, fontFamily: SANS }}>Delete this round?</span>
              <button onClick={onConfirmDelete} disabled={deleting} style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c", background: "none", border: "none", cursor: "pointer", opacity: deleting ? 0.5 : 1, fontFamily: SANS }}>
                {deleting ? "Deleting…" : "Yes"}
              </button>
              <button onClick={onCancelDelete} style={{ fontSize: 13, color: MUTED, background: "none", border: "none", cursor: "pointer", fontFamily: SANS }}>
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button onClick={onShare} disabled={sharing} style={{ ...btnBase, opacity: sharing ? 0.5 : 1 }} title="Share">
                <Share2 size={15} color={INK} />
              </button>
              <button onClick={onEdit} style={btnBase} title="Edit">
                <Pencil size={15} color={INK} />
              </button>
              <button onClick={onDelete} style={btnBase} title="Delete">
                <Trash2 size={15} color="#f87171" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Section 2: Course Headline ── */}
      <div style={{ paddingBottom: 14 }}>
        {dateEyebrow && (
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.4px", color: MUTED, marginBottom: 4 }}>
            {dateEyebrow}
          </div>
        )}
        <div style={{ fontSize: 26, fontWeight: 700, color: INK, letterSpacing: "-0.6px", lineHeight: 1.1, fontFamily: SANS }}>
          {courseName || "—"}
        </div>
        {(round.tee_box || (tee?.course_rating != null && tee?.slope_rating != null)) && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: MUTED, marginTop: 5 }}>
            {round.tee_box && (
              <span style={{ textTransform: "capitalize" }}>{round.tee_box} tees</span>
            )}
            {tee?.course_rating != null && tee?.slope_rating != null && (
              <>
                <span style={{ display: "inline-block", width: 3, height: 3, borderRadius: "50%", background: "currentColor", opacity: 0.5 }} />
                <span>{tee.course_rating} / {tee.slope_rating}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Section 3: Score Row ── */}
      <div style={{
        display: "flex", alignItems: "flex-end", gap: 14,
        borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`,
        padding: "14px 0",
      }}>
        {/* Gross + Net block */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 44, fontWeight: 700, letterSpacing: "-1.8px", color: INK, lineHeight: 1 }}>
              {totalScore || "—"}
            </div>
            {toPar != null && (
              <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: toPar <= 0 ? "#059669" : "#f87171", marginTop: 2 }}>
                {formatToPar(toPar)}
              </div>
            )}
          </div>
          {netScore != null && (
            <>
              <div style={{ width: 1, background: LINE, height: 44, margin: "0 14px", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: MUTED, marginBottom: 3 }}>
                  Net{courseHandicap != null ? ` · hcp ${courseHandicap < 0 ? `+${Math.abs(courseHandicap)}` : courseHandicap}` : ""}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: PRIMARY, lineHeight: 1 }}>
                  {netScore}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Round-shape bar strip */}
        {(frontHoles.length > 0 || backHoles.length > 0) && (
          <div style={{ flex: 1, display: "flex", gap: 14, alignItems: "flex-start", overflow: "hidden", minWidth: 0 }}>
            {frontHoles.length > 0 && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 2.5, height: 24, alignItems: "flex-end" }}>
                  {frontHoles.map((h) => {
                    const key = barKey(h.toPar);
                    return (
                      <div
                        key={h.hole}
                        style={{
                          flex: 1, height: `${BAR_HEIGHTS[key]}%`,
                          borderRadius: "2px 2px 0 0",
                          background: scoreChartColor(key, palette),
                          opacity: key === "par" ? 0.35 : 1,
                        }}
                      />
                    );
                  })}
                </div>
                {front9Score != null && (
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: MUTED, marginTop: 4 }}>
                    FRONT <span style={{ fontFamily: MONO }}>{front9Score}</span>
                  </div>
                )}
              </div>
            )}

            {backHoles.length > 0 && (
              <div style={{ flex: 1, minWidth: 0, marginTop: 6 }}>
                <div style={{ display: "flex", gap: 2.5, height: 24, alignItems: "flex-end" }}>
                  {backHoles.map((h) => {
                    const key = barKey(h.toPar);
                    return (
                      <div
                        key={h.hole}
                        style={{
                          flex: 1, height: `${BAR_HEIGHTS[key]}%`,
                          borderRadius: "2px 2px 0 0",
                          background: scoreChartColor(key, palette),
                          opacity: key === "par" ? 0.35 : 1,
                        }}
                      />
                    );
                  })}
                </div>
                {back9Score != null && (
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: MUTED, marginTop: 4 }}>
                    BACK <span style={{ fontFamily: MONO }}>{back9Score}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Section 4: Inline Stats Row ── */}
      {(round.total_putts != null || round.total_gir != null) && (
        <div style={{ display: "flex", gap: 16, padding: "8px 0 0", fontFamily: MONO, fontSize: 12, color: MUTED }}>
          {round.total_putts != null && (
            <span>
              <span style={{ fontWeight: 600, color: INK }}>{round.total_putts}</span>{" "}putts
            </span>
          )}
          {round.total_gir != null && (
            <span>
              <span style={{ fontWeight: 600, color: PRIMARY }}>{round.total_gir}</span>/18 GIR
            </span>
          )}
        </div>
      )}

      {/* ── Section 5: Score-Color Chip Row ── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "10px 0 0" }}>
        {CHIP_DEFS.map(({ key, label, bg, text }) => {
          const count = chipCounts[key];
          if (!count) return null;
          return (
            <div
              key={key}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 9px", borderRadius: 99, background: bg,
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: text }}>{count}</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", color: text }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
