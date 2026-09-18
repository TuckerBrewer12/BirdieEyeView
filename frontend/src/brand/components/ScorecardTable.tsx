import { cn } from "@/brand/cn";
import { strokesToPar } from "@/domain";
import { scoreFill, toParDisplay, toParTextClass } from "@/brand/theme";

export interface ScorecardHole {
  hole: number;
  par: number | null;
  strokes: number | null;
  putts: number | null;
  greenInRegulation: boolean | null;
  shotsToGreen: number | null;
}

interface ScorecardTableProps {
  holes: ScorecardHole[];
  /** The nine's own total column — "OUT" or "IN". */
  label: string;
  /** Adds a round-total column. Only the closing nine should pass this. */
  roundTotal?: { par: number | null; strokes: number | null };
  className?: string;
}

function sum(values: (number | null)[]): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

const CELL = "px-1 py-1.5 text-center";
const NINE_CELL = "w-12 bg-muted px-2 py-1.5 text-center font-bold";
const TOTAL_CELL = "w-12 bg-secondary px-2 py-1.5 text-center font-bold";

/**
 * A read-only nine of a scorecard: par, score, to par, and whatever else the
 * card carried.
 *
 * Putts, GIR and shots-to-green each appear only when at least one hole has
 * them, because a scanned card often has none of the three and a row of
 * dashes reads as a failed scan rather than a card that never held the data.
 */
function ScorecardTable({ holes, label, roundTotal, className }: ScorecardTableProps) {
  const ninePar = sum(holes.map((hole) => hole.par));
  const nineStrokes = sum(holes.map((hole) => hole.strokes));
  const scored = holes.some((hole) => hole.strokes != null);
  const nineToPar = scored && ninePar > 0 ? strokesToPar(nineStrokes, ninePar) : null;

  const showPutts = holes.some((hole) => hole.putts != null);
  const showGir = holes.some((hole) => hole.greenInRegulation != null);
  const showShots = holes.some((hole) => hole.shotsToGreen != null);

  const roundToPar = strokesToPar(roundTotal?.strokes, roundTotal?.par);

  return (
    <table data-slot="scorecard-table" className={cn("w-full border-collapse", className)}>
      <thead>
        <tr className="bg-muted text-xs font-medium text-muted-foreground uppercase">
          <th className="w-16 px-3 py-2 text-left">Hole</th>
          {holes.map((hole) => (
            <th key={hole.hole} className="min-w-9 px-1 py-2 text-center">{hole.hole}</th>
          ))}
          <th className="w-12 bg-secondary px-2 py-2 text-center">{label}</th>
          {roundTotal && <th className="w-12 bg-secondary px-2 py-2 text-center">TOT</th>}
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-border text-xs text-muted-foreground">
          <td className="px-3 py-1.5 font-medium">Par</td>
          {holes.map((hole) => (
            <td key={hole.hole} className={CELL}>{hole.par ?? "-"}</td>
          ))}
          <td className={NINE_CELL}>{ninePar || "-"}</td>
          {roundTotal && <td className={TOTAL_CELL}>{roundTotal.par ?? "-"}</td>}
        </tr>

        <tr className="border-b border-border">
          <td className="px-3 py-1.5 text-sm font-semibold text-foreground">Score</td>
          {holes.map((hole) => (
            <td key={hole.hole} className="px-1 py-1 text-center">
              <span
                className="inline-flex h-7 w-9 items-center justify-center rounded text-sm font-semibold text-primary-foreground"
                style={hole.strokes == null ? undefined : { background: scoreFill(hole.strokes, hole.par) }}
              >
                {hole.strokes ?? "-"}
              </span>
            </td>
          ))}
          <td className={cn(NINE_CELL, "text-sm text-foreground")}>{scored ? nineStrokes : "-"}</td>
          {roundTotal && (
            <td className={cn(TOTAL_CELL, "text-base text-foreground")}>{roundTotal.strokes || "-"}</td>
          )}
        </tr>

        <tr className={cn("text-xs", (showPutts || showGir || showShots) && "border-b border-border")}>
          <td className="px-3 py-1.5 font-medium text-muted-foreground">To Par</td>
          {holes.map((hole) => {
            const toPar = strokesToPar(hole.strokes, hole.par);
            return (
              <td key={hole.hole} className={cn(CELL, toParTextClass(toPar))}>
                {toParDisplay(toPar, "-")}
              </td>
            );
          })}
          <td className={cn(NINE_CELL, toParTextClass(nineToPar))}>{toParDisplay(nineToPar, "-")}</td>
          {roundTotal && (
            <td className={cn(TOTAL_CELL, "text-sm", toParTextClass(roundToPar))}>
              {toParDisplay(roundToPar, "-")}
            </td>
          )}
        </tr>

        {showPutts && (
          <tr className={cn("text-xs text-muted-foreground", (showGir || showShots) && "border-b border-border")}>
            <td className="px-3 py-1.5 font-medium">Putts</td>
            {holes.map((hole) => (
              <td key={hole.hole} className={CELL}>{hole.putts ?? "-"}</td>
            ))}
            <td className={NINE_CELL}>{sum(holes.map((h) => h.putts)) || "-"}</td>
            {roundTotal && <td className={TOTAL_CELL}>{sum(holes.map((h) => h.putts)) || "-"}</td>}
          </tr>
        )}

        {showGir && (
          <tr className={cn("text-xs", showShots && "border-b border-border")}>
            <td className="px-3 py-1.5 font-bold text-score-birdie">GIR</td>
            {holes.map((hole) => (
              <td
                key={hole.hole}
                className={cn(CELL, hole.greenInRegulation ? "text-score-birdie" : "text-muted-foreground")}
              >
                {hole.greenInRegulation === true ? "●" : hole.greenInRegulation === false ? "○" : "–"}
              </td>
            ))}
            <td className={cn(NINE_CELL, "text-score-birdie")}>
              {holes.filter((hole) => hole.greenInRegulation === true).length || "-"}
            </td>
            {roundTotal && (
              <td className={cn(TOTAL_CELL, "text-score-birdie")}>
                {holes.filter((hole) => hole.greenInRegulation === true).length || "-"}
              </td>
            )}
          </tr>
        )}

        {showShots && (
          <tr className="text-xs text-muted-foreground">
            <td className="px-3 py-1.5 font-medium">S2G</td>
            {holes.map((hole) => (
              <td key={hole.hole} className={CELL}>{hole.shotsToGreen ?? "-"}</td>
            ))}
            <td className={NINE_CELL}>{sum(holes.map((h) => h.shotsToGreen)) || "-"}</td>
            {roundTotal && <td className={TOTAL_CELL}>{sum(holes.map((h) => h.shotsToGreen)) || "-"}</td>}
          </tr>
        )}
      </tbody>
    </table>
  );
}

export { ScorecardTable };
