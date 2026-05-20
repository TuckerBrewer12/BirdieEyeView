import type { AnalyticsFilters } from "@/types/analytics";

// ─── Design tokens ────────────────────────────────────────────────────────────
const INK        = "#131613";
const MUTED      = "#6b7765";
const LINE       = "#e4e9e1";
const SANS       = '"DM Sans", system-ui, sans-serif';
const MONO       = '"DM Mono", monospace';
const PRIMARY_DK = "#1b2b1e";

// ─── Filter helpers ───────────────────────────────────────────────────────────
type RangeKey = "L20" | "L50" | "YTD" | "All";

const RANGE_KEYS: RangeKey[] = ["L20", "L50", "YTD", "All"];

function filtersToRange(f: AnalyticsFilters): RangeKey {
  if (f.timeframe === "ytd") return "YTD";
  if (f.limit === 20) return "L20";
  if (f.limit === 50) return "L50";
  return "All";
}

function rangeToFilters(range: RangeKey, courseId: string): AnalyticsFilters {
  switch (range) {
    case "L20": return { limit: 20,  timeframe: "all", courseId };
    case "L50": return { limit: 50,  timeframe: "all", courseId };
    case "YTD": return { limit: 500, timeframe: "ytd", courseId };
    case "All": return { limit: 500, timeframe: "all", courseId };
  }
}

function rangeContextLabel(range: RangeKey, totalRounds: number): string {
  const count = `${totalRounds} rds`;
  switch (range) {
    case "L20": return `${count} · last 20`;
    case "L50": return `${count} · last 50`;
    case "YTD": return `${count} · YTD ${new Date().getFullYear()}`;
    case "All": return `${count} · all time`;
  }
}

function formatHI(hi: number | null | undefined): string {
  if (hi == null) return "—";
  if (hi < 0) return `+${Math.abs(hi).toFixed(1)}`;
  return hi.toFixed(1);
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface AnalyticsHeaderProps {
  totalRounds: number;
  handicapIndex: number | null;
  scoringAvg: number | null;
  bestScore: number | null;
  avgPutts: string | null;
  girPct: number | null;
  filters: AnalyticsFilters;
  setFilters: (f: AnalyticsFilters) => void;
  playedCourses: { id: string; name: string | null; location: string | null }[];
  hasHomeCourse: boolean;
  accentHcap: string;
  accentAvg: string;
  accentBest: string;
  accentPutts: string;
  accentGir: string;
}

// ─── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      flex: "0 0 90px",
      padding: "12px 12px 14px",
      background: "#fff",
      border: `1px solid ${LINE}`,
      borderRadius: 10,
      display: "flex",
      flexDirection: "column",
      gap: 6,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Top accent strip */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent }} />

      {/* Label row */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: accent, flexShrink: 0 }} />
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "1.2px",
          textTransform: "uppercase", color: accent, fontFamily: SANS,
        }}>
          {label}
        </div>
      </div>

      {/* Value */}
      <div style={{
        fontFamily: MONO, fontSize: 22, fontWeight: 700,
        color: INK, letterSpacing: "-0.6px", lineHeight: 1,
      }}>
        {value}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AnalyticsHeader({
  totalRounds,
  handicapIndex,
  scoringAvg,
  bestScore,
  avgPutts,
  girPct,
  filters,
  setFilters,
  playedCourses,
  hasHomeCourse,
  accentHcap,
  accentAvg,
  accentBest,
  accentPutts,
  accentGir,
}: AnalyticsHeaderProps) {
  const activeRange = filtersToRange(filters);

  const courseLabel = (() => {
    if (filters.courseId === "all") return "All Courses";
    if (filters.courseId === "home") return "Home Course";
    const c = playedCourses.find((p) => p.id === filters.courseId);
    return c?.name ?? "All Courses";
  })();

  return (
    <div style={{ fontFamily: SANS }}>

      {/* ── Section 1: Title Bar ── */}
      <div style={{
        padding: "4px 16px 10px",
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
      }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px", color: INK, fontFamily: SANS }}>
          Analytics
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: MUTED, whiteSpace: "nowrap" }}>
          {rangeContextLabel(activeRange, totalRounds)}
        </div>
      </div>

      {/* ── Section 2: Unified Filter Row ── */}
      <div style={{ padding: "0 16px", display: "flex", gap: 8, alignItems: "center" }}>

        {/* Range segmented control */}
        <div style={{
          display: "inline-flex",
          background: "#fff",
          border: `1px solid ${LINE}`,
          borderRadius: 99,
          padding: 3,
          gap: 2,
        }}>
          {RANGE_KEYS.map((key) => {
            const isActive = key === activeRange;
            return (
              <button
                key={key}
                onClick={() => setFilters(rangeToFilters(key, filters.courseId))}
                style={{
                  padding: "5px 12px",
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: SANS,
                  border: "none",
                  cursor: "pointer",
                  background: isActive ? PRIMARY_DK : "transparent",
                  color: isActive ? "#fff" : MUTED,
                  lineHeight: 1,
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* Course chip — native select styled as pill */}
        <div style={{
          marginLeft: "auto",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "6px 11px",
          borderRadius: 99,
          background: "#fff",
          border: `1px solid ${LINE}`,
          fontSize: 12,
          fontWeight: 600,
          color: INK,
          cursor: "pointer",
          position: "relative",
        }}>
          <span>{courseLabel}</span>
          <span style={{ color: MUTED, fontSize: 10 }}>▾</span>
          <select
            value={filters.courseId}
            onChange={(e) => setFilters({ ...filters, courseId: e.target.value })}
            style={{
              position: "absolute", inset: 0,
              opacity: 0, cursor: "pointer",
              width: "100%", height: "100%",
            }}
          >
            <option value="all">All Courses</option>
            {hasHomeCourse && <option value="home">Home Course</option>}
            {playedCourses.map((c) => (
              <option key={c.id} value={c.id}>{c.name ?? "Unnamed Course"}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Section 3: Stat Strip ── */}
      <div style={{
        marginTop: 14,
        padding: "0 16px",
        display: "flex",
        gap: 10,
        overflowX: "auto",
        scrollbarWidth: "none",
        // webkit scrollbar hidden via className below
      }} className="[&::-webkit-scrollbar]:hidden">
        <StatTile label="Hcap"  value={formatHI(handicapIndex)}                              accent={accentHcap} />
        <StatTile label="Avg"   value={scoringAvg != null ? scoringAvg.toFixed(1) : "—"}     accent={accentAvg} />
        <StatTile label="Best"  value={bestScore != null ? String(bestScore) : "—"}           accent={accentBest} />
        <StatTile label="Putts" value={avgPutts ?? "—"}                                      accent={accentPutts} />
        <StatTile label="GIR"   value={girPct != null ? `${girPct.toFixed(1)}%` : "—"}       accent={accentGir} />
      </div>
    </div>
  );
}
