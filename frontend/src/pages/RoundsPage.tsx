import { useState, useMemo, useCallback, useRef, useEffect, Fragment } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CourseLinkSearch } from "@/components/CourseLinkSearch";
import { api } from "@/lib/api";
import { formatCourseName } from "@/lib/courseName";
import { getStoredColorBlindMode } from "@/lib/accessibility";
import { getColorBlindPalette } from "@/lib/chartPalettes";
import type { RoundSummary, CourseSummary } from "@/types/golf";
import { PageHeader } from "@/components/layout/PageHeader";

// ─── Design tokens (mobile) ───────────────────────────────────────────────────
const FONT  = '"Inter", system-ui, -apple-system, sans-serif';
const INK   = "#131613";
const MUTED = "#6b7765";
const LINE  = "#e4e9e1";
const PRIMARY = "#2d7a3a";
const PRIMARY_DK = "#1b2b1e";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getShapeKey(strokes: number | null | undefined, par: number | null | undefined): string {
  if (strokes == null || par == null) return "par";
  const d = strokes - par;
  if (d <= -2) return "eagle";
  if (d === -1) return "birdie";
  if (d === 0) return "par";
  if (d === 1) return "bogey";
  if (d === 2) return "double_bogey";
  if (d === 3) return "triple_bogey";
  return "quad_bogey";
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


// ─── Types ────────────────────────────────────────────────────────────────────
interface RoundsPageProps { userId: string; }
type SortKey = "date" | "total_score" | "to_par" | "course_name";
type FilterMode = "all" | "l20" | "best" | string;

// ─── Page ─────────────────────────────────────────────────────────────────────
export function RoundsPage({ userId }: RoundsPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: rounds = [], isLoading: loading } = useQuery({
    queryKey: ["rounds", userId],
    queryFn: () => api.getRoundsForUser(userId, 100),
  });

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  // Link-course state
  const [linkingRoundId, setLinkingRoundId] = useState<string | null>(null);
  const [linkQuery, setLinkQuery] = useState("");
  const [linkResults, setLinkResults] = useState<CourseSummary[]>([]);
  const [linkSearching, setLinkSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const linkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (linkTimer.current) clearTimeout(linkTimer.current); }, []);

  const colorBlindMode = useMemo(() => getStoredColorBlindMode(), []);
  const colorBlindPalette = useMemo(() => getColorBlindPalette(colorBlindMode), [colorBlindMode]);

  // Score colors for shape strip
  const scoreColors = useMemo((): Record<string, string> => {
    const cb = colorBlindPalette?.score as Record<string, string> | undefined;
    if (cb) return cb;
    return {
      eagle: "#f59e0b", birdie: "#059669", par: "#9ca3af",
      bogey: "#f87171", double_bogey: "#60a5fa", triple_bogey: "#a78bfa", quad_bogey: "#6d28d9",
    };
  }, [colorBlindPalette]);

  // Course chips (top 6 by round count)
  const courseChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rounds) {
      if (r.course_name) counts.set(r.course_name, (counts.get(r.course_name) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name]) => name);
  }, [rounds]);

  const handleLinkQuery = useCallback((q: string) => {
    setLinkQuery(q);
    if (linkTimer.current) clearTimeout(linkTimer.current);
    if (q.trim().length < 2) { setLinkResults([]); return; }
    linkTimer.current = setTimeout(async () => {
      setLinkSearching(true);
      try {
        const results = await api.searchCourses(q.trim(), userId);
        setLinkResults(results);
      } catch { setLinkResults([]); }
      finally { setLinkSearching(false); }
    }, 300);
  }, [userId]);

  const handleSelectCourse = useCallback(async (roundId: string, course: CourseSummary) => {
    setLinking(true);
    setLinkError(null);
    try {
      const updated = await api.linkCourse(roundId, course.id);
      queryClient.setQueryData<RoundSummary[]>(["rounds", userId], (prev) =>
        prev ? prev.map((r) => r.id === roundId ? updated : r) : [updated]
      );
      setLinkingRoundId(null);
      setLinkQuery("");
      setLinkResults([]);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Could not link that round to the selected course.");
    } finally {
      setLinking(false);
    }
  }, [queryClient, userId]);

  const openLink = useCallback((roundId: string) => {
    setLinkingRoundId(roundId);
    setLinkQuery(""); setLinkResults([]); setLinkError(null);
  }, []);

  const closeLink = useCallback(() => {
    setLinkingRoundId(null);
    setLinkQuery(""); setLinkResults([]); setLinkError(null);
  }, []);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) { setSortAsc((prev) => !prev); }
    else { setSortKey(key); setSortAsc(key === "course_name"); }
  }, [sortKey]);

  // Filtered + sorted list
  // Mobile filtered list (includes filterMode)
  const mobileFiltered = useMemo(() => {
    let result = [...rounds];
    if (filterMode === "l20") {
      result = [...result].sort((a, b) => ((b.date ?? "") > (a.date ?? "") ? 1 : -1)).slice(0, 20);
    } else if (filterMode !== "all" && filterMode !== "best") {
      result = result.filter((r) => r.course_name === filterMode);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.course_name?.toLowerCase().includes(q));
    }
    const key: SortKey = filterMode === "best" ? "total_score" : sortKey;
    const asc = filterMode === "best" ? true : sortAsc;
    result.sort((a, b) => {
      let av: number | string | null, bv: number | string | null;
      switch (key) {
        case "date":        av = a.date ?? "";       bv = b.date ?? "";       break;
        case "total_score": av = a.total_score;      bv = b.total_score;      break;
        case "to_par":      av = a.to_par;           bv = b.to_par;           break;
        case "course_name": av = a.course_name ?? ""; bv = b.course_name ?? ""; break;
      }
      if (av === null) return 1; if (bv === null) return -1;
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
      return 0;
    });
    return result;
  }, [rounds, filterMode, search, sortKey, sortAsc]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading rounds...</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Rounds" subtitle={`${rounds.length} rounds played`} scrollThreshold={100} />

      {/* ── Rounds list ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 24 }}>

        {/* Title */}
        <div style={{ padding: "4px 0 0", fontFamily: FONT, fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", color: INK }}>
          Rounds
        </div>

        {/* Search pill */}
        <div style={{ position: "relative" }}>
          <svg
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            width={14} height={14} viewBox="0 0 20 20" fill="none"
          >
            <circle cx="9" cy="9" r="6" stroke={MUTED} strokeWidth="2" />
            <path d="M13.5 13.5L17 17" stroke={MUTED} strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Search by course…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", height: 36, paddingLeft: 34, paddingRight: 12,
              fontFamily: FONT, fontSize: 13, color: INK,
              background: "#fff", border: `1px solid ${LINE}`, borderRadius: 99,
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Filter chip row */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
          {(["All", "L20", "Best", ...courseChips] as const).map((chip) => {
            const mode: FilterMode = chip === "All" ? "all" : chip === "L20" ? "l20" : chip === "Best" ? "best" : chip;
            const active = filterMode === mode;
            return (
              <button
                key={chip}
                type="button"
                onClick={() => setFilterMode(active ? "all" : mode)}
                style={{
                  padding: "5px 11px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                  fontFamily: FONT, whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer",
                  border: `1px solid ${active ? PRIMARY_DK : LINE}`,
                  background: active ? PRIMARY_DK : "#fff",
                  color: active ? "#fff" : MUTED,
                  transition: "all 0.15s",
                }}
              >
                {chip === "All" ? "All" : chip === "L20" ? "L20" : chip === "Best" ? "Best" : formatCourseName(chip)}
              </button>
            );
          })}
        </div>

        {/* Count + sort strip */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 4px 0" }}>
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: INK }}>
            {mobileFiltered.length} {mobileFiltered.length === 1 ? "round" : "rounds"}
          </span>
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: PRIMARY, pointerEvents: "none" }}>
              {filterMode === "best" ? "Score ↑" : sortKey === "date" ? `Date ${sortAsc ? "↑" : "↓"}` : sortKey === "total_score" ? `Score ${sortAsc ? "↑" : "↓"}` : sortKey === "to_par" ? `To Par ${sortAsc ? "↑" : "↓"}` : `Course ${sortAsc ? "↑" : "↓"}`}
            </span>
            <select
              value={filterMode === "best" ? "total_score" : sortKey}
              onChange={(e) => {
                if (filterMode === "best") setFilterMode("all");
                handleSort(e.target.value as SortKey);
              }}
              style={{
                position: "absolute", inset: 0, opacity: 0, cursor: "pointer",
                width: "100%", height: "100%",
              }}
            >
              <option value="date">Date</option>
              <option value="total_score">Score</option>
              <option value="to_par">To Par</option>
              <option value="course_name">Course</option>
            </select>
          </div>
        </div>

        {/* Link error */}
        {linkError && (
          <div style={{ borderRadius: 12, border: "1px solid #fecaca", background: "#fff1f2", padding: "10px 14px", fontFamily: FONT, fontSize: 13, color: "#b91c1c" }}>
            {linkError}
          </div>
        )}

        {/* Round cards */}
        {mobileFiltered.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", fontFamily: FONT, fontSize: 14, color: MUTED }}>
            No rounds found.
          </div>
        ) : (
          mobileFiltered.slice(0, visibleCount).map((r) => {
            const dateParts = parseDateParts(r.date);
            const toPar = r.to_par;
            const toParText = toPar == null ? null : toPar === 0 ? "E" : toPar > 0 ? `+${toPar}` : `${toPar}`;
            const toParColor = toPar == null ? MUTED : toPar > 0 ? "#f87171" : toPar < 0 ? "#059669" : MUTED;
            const holes = r.hole_scores_summary ?? [];

            return (
              <Fragment key={r.id}>
                <div
                  style={{
                    background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10,
                    display: "grid", gridTemplateColumns: "54px 1fr auto",
                    gap: 10, alignItems: "center", cursor: "pointer", overflow: "hidden",
                  }}
                  onClick={() => { if (linkingRoundId === r.id) return; navigate(`/rounds/${r.id}`); }}
                >
                  {/* Date block */}
                  <div style={{
                    background: "#f4f6f0", borderRadius: "8px 0 0 8px",
                    padding: "10px 0", textAlign: "center",
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: 2, alignSelf: "stretch", justifyContent: "center",
                  }}>
                    {dateParts ? (
                      <>
                        <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: MUTED }}>{dateParts.month}</span>
                        <span style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: INK, lineHeight: 1 }}>{dateParts.day}</span>
                        <span style={{ fontFamily: FONT, fontSize: 9, color: MUTED }}>{dateParts.year}</span>
                      </>
                    ) : (
                      <span style={{ fontFamily: FONT, fontSize: 9, color: MUTED }}>—</span>
                    )}
                  </div>

                  {/* Course + stats + shape strip */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 0", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                      <span style={{
                        fontFamily: FONT, fontSize: 16, fontWeight: 700, letterSpacing: "-0.3px",
                        color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        minWidth: 0, flex: 1,
                      }}>
                        {r.course_name ? formatCourseName(r.course_name) : "Unknown course"}
                      </span>
                      {!r.course_id && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); linkingRoundId === r.id ? closeLink() : openLink(r.id); }}
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: MUTED, flexShrink: 0, display: "flex", alignItems: "center" }}
                        >
                          <Link2 size={11} />
                        </button>
                      )}
                    </div>

                    <div style={{ fontFamily: FONT, fontSize: 10, color: MUTED, display: "flex", gap: 8, alignItems: "center" }}>
                      {r.front_nine != null && r.back_nine != null && (
                        <span><strong style={{ color: INK, fontWeight: 700 }}>{r.front_nine}·{r.back_nine}</strong></span>
                      )}
                      {r.total_putts != null && (
                        <span><strong style={{ color: INK, fontWeight: 700 }}>{r.total_putts}</strong> putts</span>
                      )}
                      {r.tee_box && <span>{r.tee_box}</span>}
                    </div>

                    {holes.length > 0 && (
                      <div style={{ display: "flex", gap: 1.5, marginTop: 4, height: 10 }}>
                        {holes.map((h) => {
                          const key = getShapeKey(h.s, h.p);
                          return (
                            <div key={h.h} style={{
                              flex: 1, borderRadius: 1.5,
                              background: scoreColors[key] ?? "#9ca3af",
                              opacity: key === "par" ? 0.35 : 1,
                            }} />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Score + to par */}
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, paddingRight: 14, whiteSpace: "nowrap" }}>
                    <span style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, letterSpacing: "-0.8px", lineHeight: 1, color: INK }}>
                      {r.total_score ?? "—"}
                    </span>
                    {toParText && (
                      <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: toParColor }}>
                        {toParText}
                      </span>
                    )}
                  </div>
                </div>

                {/* Inline link-course panel */}
                <AnimatePresence>
                  {linkingRoundId === r.id && (
                    <motion.div
                      key={`${r.id}-link`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: "hidden", borderRadius: 10, border: "1px solid #bfdbfe", background: "#eff6ff" }}
                    >
                      <div style={{ padding: 16 }}>
                        <CourseLinkSearch
                          title={`Link "${r.course_name ? formatCourseName(r.course_name) : "this round"}" to a saved course`}
                          query={linkQuery}
                          results={linkResults}
                          searching={linkSearching}
                          linking={linking}
                          onQueryChange={handleLinkQuery}
                          onSelectCourse={(c) => handleSelectCourse(r.id, c)}
                          onClose={closeLink}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Fragment>
            );
          })
        )}

        {visibleCount < mobileFiltered.length && (
          <button
            type="button"
            onClick={() => setVisibleCount((n) => n + 50)}
            style={{
              padding: "10px", fontFamily: FONT, fontSize: 13, fontWeight: 600,
              color: MUTED, background: "#fff", border: `1px solid ${LINE}`,
              borderRadius: 10, cursor: "pointer", width: "100%",
            }}
          >
            Load more ({mobileFiltered.length - visibleCount} remaining)
          </button>
        )}
      </div>

    </div>
  );
}
