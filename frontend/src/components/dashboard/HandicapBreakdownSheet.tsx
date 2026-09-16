import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, Circle } from "lucide-react";
import type { DualTrendPoint } from "@/hooks/useDashboardViewModel";
import type { ScoreDifferentialRow, ScoreTrendRow } from "@/types/analytics";
import { formatCourseName } from "@/lib/courseName";

// WHS table: indexed by (n - 3), capped at 17 (for 20+ rounds)
const WHS_TABLE: Array<[number, number]> = [
  [1, -2.0], // 3
  [1, -1.0], // 4
  [1,  0.0], // 5
  [2, -1.0], // 6
  [2,  0.0], // 7
  [2,  0.0], // 8
  [3,  0.0], // 9
  [3,  0.0], // 10
  [3,  0.0], // 11
  [4,  0.0], // 12
  [4,  0.0], // 13
  [4,  0.0], // 14
  [5,  0.0], // 15
  [5,  0.0], // 16
  [6,  0.0], // 17
  [6,  0.0], // 18
  [7,  0.0], // 19
  [8,  0.0], // 20+
];

function formatHI(hi: number | null | undefined): string {
  if (hi == null) return "—";
  if (hi < 0) return `+${Math.abs(hi).toFixed(1)}`;
  return hi.toFixed(1);
}

interface Row {
  round_index: number;
  course_name: string | null;
  score: number | null;
  course_rating: number | null;
  slope_rating: number | null;
  differential: number | null;
  used_in_hi: boolean | null;
}

interface HandicapBreakdownSheetProps {
  open: boolean;
  onClose: () => void;
  handicapIndex: number | null;
  dualData: DualTrendPoint[];
  scoreDifferentials: ScoreDifferentialRow[];
  scoreTrend: ScoreTrendRow[];
}

export function HandicapBreakdownSheet({
  open,
  onClose,
  handicapIndex,
  dualData,
  scoreDifferentials,
  scoreTrend,
}: HandicapBreakdownSheetProps) {
  // Build merged rows (last 20, most recent first)
  const rows: Row[] = dualData
    .slice()
    .reverse()
    .map((d) => {
      const diff = scoreDifferentials.find((s) => s.round_index === d.round_index);
      const trend = scoreTrend.find((s) => s.round_index === d.round_index);
      return {
        round_index: d.round_index,
        course_name: trend?.course_name ?? null,
        score: diff?.score ?? d.total_score ?? null,
        course_rating: diff?.course_rating ?? null,
        slope_rating: diff?.slope_rating ?? null,
        differential: d.differential ?? null,
        used_in_hi: d.used_in_hi ?? null,
      };
    });

  // WHS math for the explanation panel
  const validDiffs = rows
    .filter((r) => r.differential != null)
    .map((r) => r.differential!);
  const n = Math.min(validDiffs.length, 20);
  const tableIdx = n < 3 ? -1 : Math.min(n - 3, WHS_TABLE.length - 1);
  const [countUsed, adjustment] = tableIdx >= 0 ? WHS_TABLE[tableIdx] : [0, 0];

  const usedDiffs = rows
    .filter((r) => r.used_in_hi === true && r.differential != null)
    .map((r) => r.differential!);
  const diffAvg = usedDiffs.length
    ? usedDiffs.reduce((a, b) => a + b, 0) / usedDiffs.length
    : null;

  const hasRatedRounds = rows.some((r) => r.course_rating != null);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Sheet — slides in from right */}
          <motion.div
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl overflow-y-auto"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-5 py-4 z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Handicap Index
                  </div>
                  <div className="text-2xl font-black text-gray-900 leading-tight tracking-tight">
                    {formatHI(handicapIndex)}
                    <span className="text-sm font-semibold text-gray-400 ml-1.5">HCP</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-5 space-y-6">

              {/* Formula */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                  WHS Formula
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="text-sm font-semibold text-gray-700 mb-1">Score Differential</div>
                  <div className="font-mono text-xs text-gray-500 leading-relaxed">
                    = (Score − Course Rating) × 113 ÷ Slope Rating
                  </div>
                  {!hasRatedRounds && (
                    <div className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">
                      Your rounds don't have slope/rating data — using score-to-par as differential
                    </div>
                  )}
                </div>
              </div>

              {/* The math */}
              {handicapIndex != null && tableIdx >= 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                    Current Calculation
                  </div>
                  <div className="bg-[#f0f7f1] rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Rounds in window</span>
                      <span className="font-semibold text-gray-900">{n} of 20</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Best differentials used</span>
                      <span className="font-semibold text-gray-900">{countUsed}</span>
                    </div>
                    {usedDiffs.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Their average</span>
                        <span className="font-semibold text-gray-900 font-mono">
                          {diffAvg?.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {adjustment !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">WHS adjustment</span>
                        <span className="font-semibold text-gray-900 font-mono">
                          {adjustment > 0 ? `+${adjustment}` : adjustment}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-[#c8e6cc] pt-3 flex justify-between">
                      <span className="text-sm font-bold text-[#2d7a3a]">Handicap Index</span>
                      <span className="text-sm font-black text-[#2d7a3a] font-mono">
                        {formatHI(handicapIndex)}
                      </span>
                    </div>
                  </div>

                  {adjustment !== 0 && (
                    <div className="mt-2 px-1 text-[11px] text-gray-400 leading-relaxed">
                      With only {n} rounds, WHS applies a {adjustment} adjustment to encourage more play before the index fully stabilizes.
                    </div>
                  )}
                </div>
              )}

              {/* Per-round table */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                  Recent Rounds · Last {rows.length}
                </div>

                {rows.length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-8">No rounds yet</div>
                ) : (
                  <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2 bg-gray-50 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      <span>Course</span>
                      <span className="text-right w-10">Score</span>
                      <span className="text-right w-16">Diff</span>
                      <span className="w-5" />
                    </div>

                    {rows.map((row) => {
                      const isUsed = row.used_in_hi === true;
                      const noData = row.differential == null;
                      return (
                        <div
                          key={row.round_index}
                          className={`grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-3 items-center ${
                            isUsed ? "bg-[#f0f7f1]" : ""
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">
                              {row.course_name
                                ? formatCourseName(row.course_name)
                                : `Round ${row.round_index}`}
                            </div>
                            {row.course_rating != null && row.slope_rating != null && (
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                                {row.course_rating} / {row.slope_rating}
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-mono font-semibold text-gray-700 text-right w-10">
                            {row.score ?? "—"}
                          </div>
                          <div className={`text-sm font-mono font-bold text-right w-16 ${
                            noData
                              ? "text-gray-300"
                              : isUsed
                                ? "text-[#2d7a3a]"
                                : "text-gray-500"
                          }`}>
                            {row.differential != null
                              ? row.differential >= 0
                                ? `+${row.differential.toFixed(1)}`
                                : row.differential.toFixed(1)
                              : "—"}
                          </div>
                          <div className="w-5 flex justify-center">
                            {isUsed ? (
                              <CheckCircle size={14} className="text-[#2d7a3a] shrink-0" />
                            ) : row.differential != null ? (
                              <Circle size={14} className="text-gray-200 shrink-0" />
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {usedDiffs.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400 px-1">
                    <CheckCircle size={12} className="text-[#2d7a3a] shrink-0" />
                    <span>Green rows are the {countUsed} best differential{countUsed !== 1 ? "s" : ""} used in your index</span>
                  </div>
                )}
              </div>

              {/* WHS context note */}
              <div className="text-[11px] text-gray-400 leading-relaxed pb-4 px-1">
                The World Handicap System uses your best {countUsed || "N"} differentials from the last 20 rounds. Differentials measure how well you played relative to the course difficulty.
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
