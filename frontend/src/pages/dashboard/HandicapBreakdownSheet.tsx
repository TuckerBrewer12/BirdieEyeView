import { CheckCircle, Circle } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/brand";
import type { WhsRoundRow } from "./useDashboardPageViewModel";

interface HandicapBreakdownSheetProps {
  open: boolean;
  onClose: () => void;
  handicapIndexLabel: string;
  rows: WhsRoundRow[];
  windowSize: number;
  countUsed: number;
  adjustment: number;
  adjustmentLabel: string | null;
  diffAvgLabel: string | null;
  hasRatedRounds: boolean;
  showCalculation: boolean;
  usedLegend: string | null;
  contextNote: string;
}

export function HandicapBreakdownSheet({
  open,
  onClose,
  handicapIndexLabel,
  rows,
  windowSize,
  countUsed,
  adjustment,
  adjustmentLabel,
  diffAvgLabel,
  hasRatedRounds,
  showCalculation,
  usedLegend,
  contextNote,
}: HandicapBreakdownSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent className="sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Handicap Index</SheetTitle>
          <SheetDescription>{handicapIndexLabel} HCP</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-4">
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

          {showCalculation && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                Current Calculation
              </div>
              <div className="bg-[#f0f7f1] rounded-2xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Rounds in window</span>
                  <span className="font-semibold text-gray-900">{windowSize} of 20</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Best differentials used</span>
                  <span className="font-semibold text-gray-900">{countUsed}</span>
                </div>
                {diffAvgLabel && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Their average</span>
                    <span className="font-semibold text-gray-900 font-mono">{diffAvgLabel}</span>
                  </div>
                )}
                {adjustmentLabel && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">WHS adjustment</span>
                    <span className="font-semibold text-gray-900 font-mono">{adjustmentLabel}</span>
                  </div>
                )}
                <div className="border-t border-[#c8e6cc] pt-3 flex justify-between">
                  <span className="text-sm font-bold text-[#2d7a3a]">Handicap Index</span>
                  <span className="text-sm font-black text-[#2d7a3a] font-mono">
                    {handicapIndexLabel}
                  </span>
                </div>
              </div>

              {adjustment !== 0 && (
                <div className="mt-2 px-1 text-[11px] text-gray-400 leading-relaxed">
                  With only {windowSize} rounds, WHS applies a {adjustment} adjustment to encourage more play before the index fully stabilizes.
                </div>
              )}
            </div>
          )}

          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              Recent Rounds · Last {rows.length}
            </div>

            {rows.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-8">No rounds yet</div>
            ) : (
              <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2 bg-gray-50 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  <span>Course</span>
                  <span className="text-right w-10">Score</span>
                  <span className="text-right w-16">Diff</span>
                  <span className="w-5" />
                </div>

                {rows.map((row) => (
                  <div
                    key={row.roundIndex}
                    className={`grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-3 items-center ${
                      row.used ? "bg-[#f0f7f1]" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {row.courseLabel}
                      </div>
                      {row.ratingLabel && (
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {row.ratingLabel}
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-mono font-semibold text-gray-700 text-right w-10">
                      {row.scoreLabel}
                    </div>
                    <div className={`text-sm font-mono font-bold text-right w-16 ${
                      !row.hasDifferential
                        ? "text-gray-300"
                        : row.used
                          ? "text-[#2d7a3a]"
                          : "text-gray-500"
                    }`}>
                      {row.differentialLabel}
                    </div>
                    <div className="w-5 flex justify-center">
                      {row.used ? (
                        <CheckCircle size={14} className="text-[#2d7a3a] shrink-0" />
                      ) : row.hasDifferential ? (
                        <Circle size={14} className="text-gray-200 shrink-0" />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {usedLegend && (
              <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400 px-1">
                <CheckCircle size={12} className="text-[#2d7a3a] shrink-0" />
                <span>{usedLegend}</span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-gray-400 leading-relaxed pb-4 px-1">
            {contextNote}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}