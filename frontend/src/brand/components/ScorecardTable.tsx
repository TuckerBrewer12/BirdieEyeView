import { cn } from "@/brand/cn";
import { HoleShape } from "@/brand/charts/HoleScoreShapes";
import { Button } from "@/brand/components/Button";
import { Input } from "@/brand/components/Input";
import { scoreFillClass, scoreOnFillClass, toParDisplay, toParTextClass } from "@/brand/theme";
import { isThreePutt, type HoleScore, type Nine, type Round } from "@/domain";

export interface ScorecardEdits {
  onStrokesChange: (hole: number, strokes: number | null) => void;
  onPuttsChange: (hole: number, putts: number | null) => void;
  onGirChange: (hole: number, gir: boolean | null) => void;
}

interface ScorecardTableProps {
  nine: Nine;
  /** The nine's own total column — "OUT" or "IN". */
  label: string;
  /** The round, when this nine closes it: adds the TOT column. */
  round?: Round;
  /** The tee played, which names the yardage row. */
  teeBox?: string | null;
  /** Makes scores, putts and greens editable. The nine shown should already carry the edits. */
  edits?: ScorecardEdits;
  className?: string;
}

const LABEL_CELL = "px-3 py-2 text-left font-bold";
const CELL = "px-1 py-2 text-center";
const NINE_CELL = "w-12 bg-muted px-2 py-2 text-center font-bold";
const TOTAL_CELL = "w-12 bg-secondary px-2 py-2 text-center font-bold";

function show(value: number | null): string {
  return value == null ? "-" : String(value);
}

/** "" clears a cell; anything that isn't a number leaves it as it was. */
function parseCount(text: string): number | null | undefined {
  if (text === "") return null;
  const value = Number.parseInt(text, 10);
  return Number.isNaN(value) ? undefined : value;
}

const NEXT_GIR = new Map<boolean | null, boolean | null>([
  [null, true],
  [true, false],
  [false, null],
]);

const GIR_WORD = new Map<boolean | null, string>([
  [true, "hit"],
  [false, "missed"],
  [null, "not recorded"],
]);

function GirMark({ gir, className }: { gir: boolean | null; className?: string }) {
  if (gir == null) return <span className="text-muted-foreground">·</span>;
  return (
    <span
      className={cn("inline-block size-2.5 rounded-sm", gir ? "bg-primary" : "bg-destructive/30", className)}
    />
  );
}

function CountInput({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  className?: string;
}) {
  return (
    <Input
      aria-label={label}
      inputMode="numeric"
      autoComplete="off"
      value={value ?? ""}
      onChange={(e) => {
        const parsed = parseCount(e.target.value);
        if (parsed !== undefined) onChange(parsed);
      }}
      className={cn("mx-auto h-7 w-8 px-0 text-center text-sm font-semibold", className)}
    />
  );
}

function ScoreCell({ hole, edits }: { hole: HoleScore; edits?: ScorecardEdits }) {
  if (!edits) {
    return (
      <td className="px-1 py-1.5">
        <div className="flex justify-center">
          <HoleShape hole={hole} />
        </div>
      </td>
    );
  }
  return (
    <td className="px-1 py-1">
      <CountInput
        label={`Hole ${hole.hole} strokes`}
        value={hole.strokes}
        onChange={(strokes) => edits.onStrokesChange(hole.hole, strokes)}
        className={
          hole.kind ? cn("border-transparent", scoreFillClass(hole.kind), scoreOnFillClass(hole.kind)) : "border-dashed"
        }
      />
    </td>
  );
}

/**
 * One nine of a scorecard: par, the score marked the way a card marks it, and to par, with the
 * nine's totals (and the round's, on the closing nine). Every figure is the server's, or
 * Round.previewEdits' while editing or before a scan is saved.
 *
 * Yards, handicap, putts, greens and shots-to-green appear only when a hole has them (putts and
 * greens always do while editing), because a scanned card often has none, and a row of dashes
 * reads as a failed scan rather than a card that never held the data.
 */
function ScorecardTable({ nine, label, round, teeBox, edits, className }: ScorecardTableProps) {
  const holes = nine.holes;
  const showYards = holes.some((hole) => hole.yardage != null);
  const showHandicap = holes.some((hole) => hole.handicap != null);
  const showPutts = edits != null || holes.some((hole) => hole.putts != null);
  const showGir = edits != null || holes.some((hole) => hole.gir != null);
  const showShots = holes.some((hole) => hole.shotsToGreen != null);

  return (
    <table data-slot="scorecard-table" className={cn("w-full border-collapse", className)}>
      <thead>
        <tr className="border-b border-border bg-muted text-xs font-bold text-muted-foreground uppercase">
          <th className={cn(LABEL_CELL, "w-20")}>Hole</th>
          {holes.map((hole) => (
            <th key={hole.hole} className="w-10 px-1 py-2 text-center">{hole.hole}</th>
          ))}
          <th className="w-12 bg-secondary px-2 py-2 text-center text-foreground">{label}</th>
          {round && <th className="w-12 bg-secondary px-2 py-2 text-center text-foreground">TOT</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {showYards && (
          <tr className="text-xs text-muted-foreground">
            <td className={cn(LABEL_CELL, "capitalize")}>{teeBox || "Yards"}</td>
            {holes.map((hole) => (
              <td key={hole.hole} className={CELL}>{show(hole.yardage)}</td>
            ))}
            <td className={NINE_CELL}>{show(nine.yards)}</td>
            {round && <td className={TOTAL_CELL}>{show(round.yards)}</td>}
          </tr>
        )}

        {showHandicap && (
          <tr className="text-xs text-muted-foreground">
            <td className={LABEL_CELL}>Hcp</td>
            {holes.map((hole) => (
              <td key={hole.hole} className={CELL}>{show(hole.handicap)}</td>
            ))}
            <td className={NINE_CELL} />
            {round && <td className={TOTAL_CELL} />}
          </tr>
        )}

        <tr className="text-sm text-foreground">
          <td className={LABEL_CELL}>Par</td>
          {holes.map((hole) => (
            <td key={hole.hole} className={CELL}>{show(hole.par)}</td>
          ))}
          <td className={NINE_CELL}>{show(nine.par)}</td>
          {round && <td className={TOTAL_CELL}>{show(round.par)}</td>}
        </tr>

        <tr className={cn("text-sm text-foreground", edits && "bg-muted/40")}>
          <td className={LABEL_CELL}>Score</td>
          {holes.map((hole) => (
            <ScoreCell key={hole.hole} hole={hole} edits={edits} />
          ))}
          <td className={NINE_CELL}>{show(nine.total)}</td>
          {round && <td className={cn(TOTAL_CELL, "text-base")}>{show(round.score)}</td>}
        </tr>

        <tr className="text-xs">
          <td className={cn(LABEL_CELL, "text-muted-foreground")}>To Par</td>
          {holes.map((hole) => (
            <td key={hole.hole} className={cn(CELL, toParTextClass(hole.toPar))}>
              {toParDisplay(hole.toPar, "-")}
            </td>
          ))}
          <td className={cn(NINE_CELL, toParTextClass(nine.toPar))}>{toParDisplay(nine.toPar, "-")}</td>
          {round && (
            <td className={cn(TOTAL_CELL, "text-sm", toParTextClass(round.toPar))}>
              {toParDisplay(round.toPar, "-")}
            </td>
          )}
        </tr>

        {showPutts && (
          <tr className={cn("text-xs text-muted-foreground", edits && "bg-muted/40")}>
            <td className={LABEL_CELL}>Putts</td>
            {holes.map((hole) =>
              edits ? (
                <td key={hole.hole} className="px-1 py-1">
                  <CountInput
                    label={`Hole ${hole.hole} putts`}
                    value={hole.putts}
                    onChange={(putts) => edits.onPuttsChange(hole.hole, putts)}
                    className="h-6 text-xs font-normal"
                  />
                </td>
              ) : (
                <td
                  key={hole.hole}
                  className={cn(CELL, isThreePutt(hole.putts) && "font-bold text-destructive")}
                >
                  {hole.putts ?? "·"}
                </td>
              ),
            )}
            <td className={NINE_CELL}>{show(nine.putts)}</td>
            {round && <td className={TOTAL_CELL}>{show(round.putts)}</td>}
          </tr>
        )}

        {showGir && (
          <tr className="text-xs">
            <td className={cn(LABEL_CELL, "text-primary")}>GIR</td>
            {holes.map((hole) =>
              edits ? (
                <td key={hole.hole} className="px-1 py-1 text-center">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Hole ${hole.hole} green: ${GIR_WORD.get(hole.gir)}`}
                    onClick={() => edits.onGirChange(hole.hole, NEXT_GIR.get(hole.gir) ?? null)}
                    className="mx-auto"
                  >
                    <GirMark gir={hole.gir} className="size-3" />
                  </Button>
                </td>
              ) : (
                <td key={hole.hole} className={CELL}>
                  <GirMark gir={hole.gir} />
                </td>
              ),
            )}
            <td className={cn(NINE_CELL, "text-primary")}>{show(nine.gir)}</td>
            {round && <td className={cn(TOTAL_CELL, "text-primary")}>{show(round.gir)}</td>}
          </tr>
        )}

        {showShots && (
          <tr className="text-xs text-muted-foreground">
            <td className={LABEL_CELL}>S2G</td>
            {holes.map((hole) => (
              <td key={hole.hole} className={CELL}>{show(hole.shotsToGreen)}</td>
            ))}
            <td className={NINE_CELL} />
            {round && <td className={TOTAL_CELL} />}
          </tr>
        )}
      </tbody>
    </table>
  );
}

export { ScorecardTable };
