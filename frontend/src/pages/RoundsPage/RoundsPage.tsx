import { useState, useMemo, useCallback, useRef, useEffect, Fragment } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { RoundPreview } from "@/brand/components/RoundPreview";
import { FilterChip, FilterChipRow } from "@/brand/components/FilterChip";
import { SearchField } from "@/brand/components/SearchField";
import { colors } from "@/brand/theme";
import { CourseLinkSearch } from "@/components/CourseLinkSearch";
import { api } from "@/lib/api";
import { formatCourseName } from "@/lib/courseName";
import type { RoundSummary, CourseSummary } from "@/types/golf";
import { PageHeader } from "@/components/layout/PageHeader";

interface RoundsPageProps { userId: string; }
type SortKey = "date" | "total_score" | "to_par" | "course_name";
type FilterMode = "all" | "l20" | "best" | string;

// ─── Page ─────────────────────────────────────────────────────────────────────
export function RoundsPage({ userId }: RoundsPageProps) {
  const { light: t } = colors;
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
        <div style={{ padding: "4px 0 0", fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", color: t.fg }}>
          Rounds
        </div>

        <SearchField
          placeholder="Search by course…"
          value={search}
          onChange={setSearch}
        />

        <FilterChipRow>
          {(["All", "L20", "Best", ...courseChips] as const).map((chip) => {
            const mode: FilterMode = chip === "All" ? "all" : chip === "L20" ? "l20" : chip === "Best" ? "best" : chip;
            const active = filterMode === mode;
            return (
              <FilterChip
                key={chip}
                label={chip === "All" || chip === "L20" || chip === "Best" ? chip : formatCourseName(chip)}
                active={active}
                onClick={() => setFilterMode(active ? "all" : mode)}
              />
            );
          })}
        </FilterChipRow>

        {/* Count + sort strip */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 4px 0" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.fg }}>
            {mobileFiltered.length} {mobileFiltered.length === 1 ? "round" : "rounds"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Field label — tap to pick sort field via native iOS picker */}
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: colors.primary, pointerEvents: "none", paddingRight: 2 }}>
                {filterMode === "best" ? "Score" : sortKey === "date" ? "Date" : sortKey === "total_score" ? "Score" : sortKey === "to_par" ? "To Par" : "Course"}
              </span>
              <select
                value={filterMode === "best" ? "total_score" : sortKey}
                onChange={(e) => {
                  if (filterMode === "best") setFilterMode("all");
                  handleSort(e.target.value as SortKey);
                }}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
              >
                <option value="date">Date</option>
                <option value="total_score">Score</option>
                <option value="to_par">To Par</option>
                <option value="course_name">Course</option>
              </select>
            </div>
            {/* Direction toggle — tap to flip asc/desc */}
            <button
              type="button"
              onClick={() => setSortAsc((prev) => !prev)}
              disabled={filterMode === "best"}
              style={{
                fontSize: 13, fontWeight: 700, color: colors.primary,
                background: "none", border: "none", padding: "2px 4px",
                cursor: filterMode === "best" ? "default" : "pointer",
                opacity: filterMode === "best" ? 0.4 : 1,
                lineHeight: 1,
              }}
            >
              {filterMode === "best" || sortAsc ? "↑" : "↓"}
            </button>
          </div>
        </div>

        {/* Link error */}
        {linkError && (
          <div style={{ borderRadius: 12, border: `1px solid ${colors.score.bogey.text}`, background: t.card, padding: "10px 14px", fontSize: 13, color: colors.score.bogey.text }}>
            {linkError}
          </div>
        )}

        {/* Round cards */}
        {mobileFiltered.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", fontSize: 14, color: t.fgMuted }}>
            No rounds found.
          </div>
        ) : (
          mobileFiltered.slice(0, visibleCount).map((r) => {
            return (
              <Fragment key={r.id}>
                <RoundPreview
                  round={r}
                  onClick={() => {
                    if (linkingRoundId === r.id) return;
                    navigate(`/rounds/${r.id}`);
                  }}
                  onLinkClick={() => {
                    if (linkingRoundId === r.id) closeLink();
                    else openLink(r.id);
                  }}
                />

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
              padding: "10px", fontSize: 13, fontWeight: 600,
              color: t.fgMuted, background: t.card, border: `1px solid ${t.border}`,
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
