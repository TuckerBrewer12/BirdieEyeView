import { useEffect, useState } from "react";
import { BentoCard } from "@/components/ui/BentoCard";
import { GOAL_OPTIONS } from "@/components/the-lab/constants";
import { AttemptsTimeline } from "@/components/the-lab/AttemptsTimeline";
import { ParTypeCard } from "@/components/the-lab/ParTypeCard";
import { PuttingDeepDiveCard } from "@/components/the-lab/PuttingDeepDiveCard";
import { UserRadarChart } from "@/components/analytics/UserRadarChart";
import type { LabViewModel } from "@/hooks/useLabViewModel";

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[11px] font-bold text-primary/50 uppercase tracking-[0.18em] whitespace-nowrap">
        {label}
      </span>
      <div className="h-px flex-1 bg-primary/10 rounded-full" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-24 rounded-2xl bg-gray-100" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="h-32 rounded-2xl bg-gray-100" />
        <div className="h-32 rounded-2xl bg-gray-100" />
      </div>
      <div className="h-80 rounded-2xl bg-gray-100" />
    </div>
  );
}

const COMPARE_OPTIONS = [
  { label: "My Level",       value: "" },
  { label: "Scratch",        value: "0" },
  { label: "Breaks 80",      value: "5" },
  { label: "Breaks 85",      value: "10" },
  { label: "Breaks 90",      value: "15" },
  { label: "Breaks 95",      value: "20" },
  { label: "Breaks 100",     value: "25" },
  { label: "Compare Friend", value: "friend" },
];

export function LabDesktopLayout(vm: LabViewModel) {
  const {
    analytics, analyticsLoading, currentGoal, setGoal, settingGoal,
    radarMode, setRadarMode, targetHandicap, setTargetHandicap,
    setSelectedFriendId,
    friendOptions, effectiveSelectedFriendId, selectedFriend,
    friendAnalyticsLoading, comparingFriend, activeProfile,
    peakInsight, peakScoreTypes, goalLabel, achievedCount,
    bestScore, recentTrend, missingAxes,
  } = vm;

  // Desktop-only UI state
  const [compareOpen, setCompareOpen] = useState(false);
  const [friendOpen, setFriendOpen] = useState(false);
  const [compactRadarLayout, setCompactRadarLayout] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 1023px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 1023px)");
    const listener = (event: MediaQueryListEvent) => setCompactRadarLayout(event.matches);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, []);

  const selectValue = targetHandicap === null ? "" : String(targetHandicap);

  const benchmarkLegendLabel = (() => {
    if (radarMode === "peak") return "Your peak game";
    if (targetHandicap === "friend") return selectedFriend?.name ?? "Friend";
    return COMPARE_OPTIONS.find((o) => o.value === selectValue)?.label ?? "Benchmark";
  })();

  return (
    <div className="space-y-6">

      {/* ── Header & Goal Selector ── */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md pb-4 pt-2 -mx-4 px-4 md:mx-0 md:px-0 md:-mt-2 md:pt-2 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-gray-100 md:border-none shadow-sm md:shadow-none">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">The Lab</h1>
          <p className="text-sm text-gray-400 mt-1">Your blueprint to lower scores.</p>
        </div>
        <div className="bg-gray-100/80 p-1.5 rounded-xl flex items-center gap-1 overflow-x-auto hide-scrollbar self-start md:self-auto">
          {GOAL_OPTIONS.map(({ label, value }) => {
            const active = currentGoal === value;
            return (
              <button
                key={value}
                onClick={() => setGoal(value)}
                disabled={settingGoal}
                className={`relative px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap outline-none ${
                  active
                    ? "text-gray-900 shadow-sm bg-white"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-200/50"
                }`}
              >
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Benchmark Analysis ── */}
      <div>
        <div className="mb-4">
          <SectionDivider label="Benchmark Analysis" />
        </div>

        {analyticsLoading ? (
          <LoadingSkeleton />
        ) : (
          <BentoCard className="!p-0 relative z-50">
            <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">

              {/* Left panel */}
              <div className="flex flex-col gap-4 w-full md:w-64 shrink-0 p-5">
                <p className="text-base font-bold text-gray-900 leading-tight">Your Performance Shape</p>

                {/* Mode tab */}
                <div className="relative flex bg-gray-100/70 p-1 rounded-xl shadow-inner isolate">
                  <div
                    className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] -z-10"
                    style={{ transform: radarMode === "benchmark" ? "translateX(0)" : "translateX(calc(100% + 4px))" }}
                  />
                  {(["benchmark", "peak"] as const).map((mode) => {
                    const active = radarMode === mode;
                    const disabled = mode === "peak" && !peakInsight;
                    return (
                      <button
                        key={mode}
                        onClick={() => !disabled && setRadarMode(mode)}
                        disabled={disabled}
                        className={`flex-1 px-2 py-1.5 text-xs font-bold transition-all duration-300 rounded-lg ${
                          active ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
                        } ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {mode === "benchmark" ? "Your Average" : "Peak Game"}
                      </button>
                    );
                  })}
                </div>

                {/* Mode-specific stats */}
                {radarMode === "benchmark" ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Your Average</p>
                      <p className="font-mono text-[32px] font-medium text-gray-900 leading-none tracking-tight">
                        {analytics?.kpis.scoring_average != null ? analytics.kpis.scoring_average.toFixed(1) : "—"}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        avg · L20 rounds
                        {bestScore != null && (
                          <> · <span className="font-semibold text-gray-600">{bestScore}</span> best</>
                        )}
                      </p>
                    </div>
                    {recentTrend != null && (
                      <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-[11px] text-gray-600 leading-snug">
                        Trending{" "}
                        <span className="font-semibold text-gray-800">
                          {recentTrend >= 0 ? "+" : ""}{recentTrend} strokes
                        </span>{" "}
                        {recentTrend >= 0 ? "above" : "below"} season avg.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {peakInsight ? (
                      <>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Peak Game</p>
                          <p className="font-mono text-[32px] font-medium text-gray-900 leading-none tracking-tight">
                            {peakInsight.bestAvg.toFixed(1)}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-1">
                            avg · best {peakInsight.top.length} rounds · overall{" "}
                            <span className="font-semibold text-gray-600">
                              {peakInsight.overallAvg?.toFixed(1) ?? "—"}
                            </span>
                          </p>
                        </div>
                        {goalLabel && (
                          <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-[11px] text-gray-600 leading-snug">
                            {peakInsight.gapToGoal <= 0 ? (
                              <>Your best rounds already <span className="font-semibold text-emerald-600">{goalLabel}</span>.</>
                            ) : (
                              <><span className="font-semibold text-gray-800">{peakInsight.gapToGoal.toFixed(1)} strokes</span> from {goalLabel} on best days.</>
                            )}
                          </div>
                        )}
                        <div className="border-t border-gray-50 pt-2 space-y-1.5">
                          {peakInsight.top.map((r, i) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-gray-400 truncate max-w-[140px]">{r.course_name ?? `Round ${i + 1}`}</span>
                              <span className="font-mono font-bold text-gray-700 shrink-0 ml-2">{r.total_score}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">No peak data yet — set a goal to enable peak analysis.</p>
                    )}
                  </div>
                )}

                {/* Compare vs. */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Compare vs.</p>

                  <div className="relative mb-2">
                    <button
                      onClick={() => setCompareOpen((o) => !o)}
                      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setCompareOpen(false); }}
                      className="w-full flex items-center justify-between rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      aria-haspopup="listbox"
                      aria-expanded={compareOpen}
                    >
                      <span className="truncate flex-1 text-left">{COMPARE_OPTIONS.find((o) => o.value === selectValue)?.label ?? "Select..."}</span>
                      <svg className={`text-gray-400 transition-transform ${compareOpen ? "rotate-180" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>

                      {compareOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                          {COMPARE_OPTIONS.map((o) => (
                            <div
                              key={o.value}
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                const v = o.value;
                                setTargetHandicap(v === "" ? null : v === "friend" ? "friend" : (Number(v) as Parameters<typeof setTargetHandicap>[0]));
                                setCompareOpen(false);
                              }}
                              className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-50 flex items-center justify-between ${selectValue === o.value ? "bg-emerald-50/50 text-emerald-700 font-semibold" : "text-gray-700"}`}
                            >
                              {o.label}
                              {selectValue === o.value && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  </div>

                  {comparingFriend && (
                    <div className="relative">
                      <button
                        onClick={() => setFriendOpen((o) => !o)}
                        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFriendOpen(false); }}
                        disabled={friendOptions.length === 0}
                        className={`w-full flex items-center justify-between rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${friendOptions.length === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}
                      >
                        <div className="flex items-center gap-2 truncate flex-1 text-left">
                          {friendOptions.length > 0 && selectedFriend ? (
                            <>
                              <div className="w-4 h-4 rounded-full bg-gray-100 text-[8px] font-bold text-gray-500 flex items-center justify-center uppercase shrink-0">
                                {selectedFriend.name.substring(0, 2)}
                              </div>
                              <span className="truncate">{selectedFriend.name}</span>
                            </>
                          ) : (
                            <span>No friends available</span>
                          )}
                        </div>
                        <svg className={`text-gray-400 transition-transform ${friendOpen ? "rotate-180" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>

                        {friendOpen && friendOptions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            {friendOptions.map((f) => (
                              <div
                                key={f.id}
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFriendId(f.id);
                                  setFriendOpen(false);
                                }}
                                className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-50 flex items-center gap-2 ${effectiveSelectedFriendId === f.id ? "bg-emerald-50/50 text-emerald-700 font-semibold" : "text-gray-700"}`}
                              >
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold uppercase shrink-0 ${effectiveSelectedFriendId === f.id ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                                  {f.name.substring(0, 2)}
                                </div>
                                <span className="truncate">{f.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Legend */}
                <div className="mt-auto pt-2 flex flex-col gap-1.5 text-[11px] text-gray-400">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: "#2d7a3a", opacity: 0.75 }} />
                    You
                  </span>
                  {activeProfile && (
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm bg-gray-400/40 shrink-0" />
                      {benchmarkLegendLabel}
                    </span>
                  )}
                  {missingAxes.length > 0 && (
                    <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5 leading-relaxed mt-1">
                      No {missingAxes.join(", ")} data yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Right panel: radar chart */}
              <div className="flex-1 min-w-0 p-5">
                <p className="text-xs text-gray-400 mb-3">Your shape vs. benchmark</p>
                {analytics?.kpis && (
                  <UserRadarChart
                    kpis={analytics.kpis}
                    scoringByPar={analytics.scoring_by_par ?? []}
                    profile={activeProfile ?? undefined}
                    height={compactRadarLayout ? 300 : 340}
                    outerRadius={compactRadarLayout ? 105 : 125}
                    primaryColor="#2d7a3a"
                    gridColor="#e5e7eb"
                    showTooltip
                    emptyMessage={
                      comparingFriend
                        ? friendOptions.length === 0
                          ? "Add friends in Social to unlock friend comparison."
                          : friendAnalyticsLoading
                            ? "Loading friend data..."
                            : "This friend needs more round data."
                        : "Select a benchmark in Compare vs. to see your shape."
                    }
                    margin={compactRadarLayout
                      ? { top: 20, right: 20, bottom: 20, left: 20 }
                      : { top: 24, right: 44, bottom: 24, left: 44 }}
                  />
                )}
              </div>

            </div>
          </BentoCard>
        )}
      </div>

      {/* ── Attempts Timeline ── */}
      {currentGoal && analytics?.score_trend &&
        analytics.score_trend.filter((r) => r.total_score != null).length >= 3 && (
        <BentoCard>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Recent Attempts</p>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                green rounds beat the goal
              </p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Times Achieved</p>
              <p className={`text-3xl font-black leading-tight ${achievedCount > 0 ? "text-emerald-600" : "text-gray-900"}`}>
                {achievedCount}
              </p>
              <p className="text-[11px] text-gray-400">
                {achievedCount === 0 ? "keep going" : achievedCount === 1 ? "once!" : `${achievedCount} rounds`}
              </p>
            </div>
          </div>
          <AttemptsTimeline scores={analytics.score_trend} goal={currentGoal} />
        </BentoCard>
      )}

      {/* ── Performance Breakdown ── */}
      {analytics && (analytics.scoring_by_par.length > 0 || analytics.three_putts_trend.length > 0) && (
        <div>
          <SectionDivider label="Performance Breakdown" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ParTypeCard
              scoringByPar={analytics.scoring_by_par}
              scoreTypeDist={analytics.score_type_distribution}
              benchmark={activeProfile}
              benchmarkLabel={
                radarMode === "peak"
                  ? "Peak game"
                  : typeof targetHandicap === "number"
                  ? `HCP ${targetHandicap}`
                  : goalLabel ?? "Target"
              }
            />
            <PuttingDeepDiveCard
              threePuttsTrend={analytics.three_putts_trend}
              puttsTrend={analytics.putts_trend}
            />
          </div>
        </div>
      )}

      {/* ── Peak Game Analysis ── */}
      {peakInsight && (
        <BentoCard>
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
            Your Peak Game
          </p>
          <div className="flex items-end gap-4 mb-3">
            <div>
              <span className="text-4xl font-black text-gray-900 tracking-tighter">
                {peakInsight.bestAvg.toFixed(1)}
              </span>
              <span className="text-sm text-gray-400 ml-2">avg · best {peakInsight.top.length} rounds</span>
            </div>
            {peakInsight.overallAvg != null && (
              <div className="pb-1 text-right">
                <span className="text-xs text-gray-400">Overall avg </span>
                <span className="text-sm font-semibold text-gray-500">{peakInsight.overallAvg.toFixed(1)}</span>
              </div>
            )}
          </div>

          {peakInsight.gapToGoal <= 0 ? (
            <p className="text-sm font-semibold text-emerald-600 mb-3">
              Your best rounds already {goalLabel} — make it your new normal.
            </p>
          ) : (
            <p className="text-sm text-gray-600 mb-3">
              Just{" "}
              <span className="font-bold text-gray-900">{peakInsight.gapToGoal.toFixed(1)} strokes</span>{" "}
              away from {goalLabel} on your best days.
            </p>
          )}

          <div className="space-y-1.5 border-t border-gray-50 pt-3 mb-4">
            {peakInsight.top.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-400 truncate max-w-[180px]">
                  {r.course_name ?? `Round ${i + 1}`}
                </span>
                <span className="font-bold text-gray-700 shrink-0 ml-2">{r.total_score}</span>
              </div>
            ))}
          </div>

          {peakScoreTypes && (() => {
            const metrics = [
              { label: "Birdies",  peak: peakScoreTypes.peak.birdies,  avg: peakScoreTypes.all.birdies,  higherIsBetter: true,  strokeMult: 1, color: "#059669" },
              { label: "Bogeys",   peak: peakScoreTypes.peak.bogeys,   avg: peakScoreTypes.all.bogeys,   higherIsBetter: false, strokeMult: 1, color: "#ef4444" },
              { label: "Doubles+", peak: peakScoreTypes.peak.doubles,  avg: peakScoreTypes.all.doubles,  higherIsBetter: false, strokeMult: 2, color: "#60a5fa" },
            ];
            return (
              <div className="border-t border-gray-50 pt-4">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                  <span className="text-[#facc15] font-extrabold">Peak</span> vs. Average
                </p>
                <div className="space-y-3">
                  {metrics.map(({ label, peak, avg, higherIsBetter, strokeMult, color }) => {
                    const diff = peak - avg;
                    const good = higherIsBetter ? diff > 0 : diff < 0;
                    const strokeImpact = (higherIsBetter ? diff : -diff) * strokeMult;
                    const maxVal = Math.max(peak, avg, 0.1) * 1.2;
                    const peakPct = (peak / maxVal) * 100;
                    const avgPct = (avg / maxVal) * 100;
                    return (
                      <div key={label} className="group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-semibold text-gray-600">{label}</span>
                          <span
                            className="text-[11px] font-bold transition-all duration-300"
                            style={{ color: good ? "#059669" : strokeImpact === 0 ? "#9ca3af" : "#ef4444" }}
                          >
                            {strokeImpact > 0 ? "+" : ""}{strokeImpact.toFixed(1)} strokes {strokeImpact >= 0 ? "gained" : "lost"}
                          </span>
                        </div>
                        <div className="space-y-1.5 mt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#facc15] font-bold w-8 text-right shrink-0">Peak</span>
                            <div className="flex-1 h-3.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm" style={{ width: `${peakPct}%`, backgroundColor: "#facc15" }} />
                            </div>
                            <span className="text-[11px] font-bold text-gray-700 w-8 shrink-0 text-right">{peak.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 w-8 text-right shrink-0">Avg</span>
                            <div className="flex-1 h-3.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${avgPct}%`, backgroundColor: color }} />
                            </div>
                            <span className="text-[11px] font-bold text-gray-400 w-8 shrink-0 text-right">{avg.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </BentoCard>
      )}

    </div>
  );
}
