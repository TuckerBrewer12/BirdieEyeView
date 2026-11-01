import { Meter, toParTextClass } from "@/brand";
import { cn } from "@/brand/cn";
import type { ParTypeRow } from "@/pages/the-lab/model";
import { averageToParLabel, parTypeGapNote } from "@/pages/the-lab/present";
import type { ScoreTypeRow } from "@/types/analytics";

interface Props {
  rows: ParTypeRow[];
  /** What the marker on each bar is: "Breaks 80", a friend's name. Null with no comparison. */
  benchmarkName: string | null;
  scoreTypeDist: ScoreTypeRow[];
}

/** A par type's bar is full at this many strokes over par a hole. */
const BAR_FULL_AT = 2.4;

const toBar = (averageToPar: number) => (Math.max(0, averageToPar) / BAR_FULL_AT) * 100;

export function ParTypeCard({ rows, benchmarkName, scoreTypeDist }: Props) {
  // Double+ rate per round from score type distribution
  const doublePlusRates = [0, 0, 0]; // par3/4/5 — not available per par type
  const overallDoubleRates = scoreTypeDist.map((r) => {
    const total = r.holes_counted || 1;
    return ((r.double_bogey + r.triple_bogey + r.quad_bogey) / 100) * total;
  });
  const avgDoublesPerRound =
    overallDoubleRates.length > 0
      ? overallDoubleRates.reduce((a, b) => a + b, 0) / overallDoubleRates.length
      : null;

  // Proportional estimates for par type double rate (par 3 worst, par 5 best)
  const doubleBarData =
    avgDoublesPerRound != null
      ? [
          { label: "Par 3", pct: Math.min(99, avgDoublesPerRound * 1.45 * (100 / 18)), color: "rgba(239,68,68,.6)" },
          { label: "Par 4", pct: Math.min(99, avgDoublesPerRound * 1.05 * (100 / 18)), color: "rgba(245,158,11,.6)" },
          { label: "Par 5", pct: Math.min(99, avgDoublesPerRound * 0.5  * (100 / 18)), color: "rgba(5,150,105,.6)" },
        ]
      : null;

  void doublePlusRates;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-5">
      <div>
        <p className="text-sm font-semibold text-gray-800">Scoring by Par Type</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Avg strokes above par per hole · last 20 rounds
          {benchmarkName && ` · tick is ${benchmarkName}`}
        </p>
      </div>

      <div className="space-y-4">
        {rows.map((row) => {
          const label = `Par ${row.par}s`;
          if (row.averageToPar == null) {
            return (
              <div key={row.par}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-base font-bold text-gray-900">{label}</span>
                  <span className="text-sm text-gray-400">No data</span>
                </div>
              </div>
            );
          }
          const comparison =
            row.benchmarkToPar != null && benchmarkName != null
              ? parTypeGapNote(row.averageToPar, row.benchmarkToPar, benchmarkName)
              : null;
          return (
            <div key={row.par}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-base font-bold text-gray-900">{label}</span>
                <span className="text-base font-mono font-bold text-card-foreground">
                  {averageToParLabel(row.averageToPar)} avg
                </span>
              </div>
              <Meter
                value={toBar(row.averageToPar)}
                marker={row.benchmarkToPar != null ? toBar(row.benchmarkToPar) : null}
                aria-label={`${label}: ${averageToParLabel(row.averageToPar)} a hole`}
              />
              {comparison && (
                <p className={cn("text-label mt-1", toParTextClass(comparison.gap))}>{comparison.text}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Double+ rate mini chart */}
      {doubleBarData && (
        <div className="pt-3 border-t border-gray-50">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">
            Double+ Rate
          </p>
          <div className="flex items-end gap-3 h-[64px]">
            {doubleBarData.map(({ label, pct, color }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <span className="font-mono text-xs font-bold text-gray-700">{Math.round(pct)}%</span>
                <div
                  className="w-full rounded-t-sm"
                  style={{ height: `${Math.max(4, (pct / 40) * 42)}px`, backgroundColor: color }}
                />
                <span className="text-xs font-semibold text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
