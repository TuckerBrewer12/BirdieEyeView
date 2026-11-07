import type { ReactNode } from "react";
import { HoleShape } from "@/brand/charts/HoleScoreShapes";
import { cn } from "@/brand/cn";
import { Button } from "@/brand/components/Button";
import { Input } from "@/brand/components/Input";
import { scoreFillClass, scoreOnFillClass, toParDisplay, toParTextClass } from "@/brand/theme";
import type { HoleScore, Nine, Round } from "@/domain";

export interface ScorecardEdits {
  onStrokesChange: (hole: number, strokes: number | null) => void;
  onPuttsChange: (hole: number, putts: number | null) => void;
  onGirChange: (hole: number, gir: boolean | null) => void;
}

interface ScorecardTableProps {
  round: Round;
  /** The tee played, which names the yardage row. */
  teeBox?: string | null;
  /** Makes scores, putts and greens editable. The round shown should already carry the edits. */
  edits?: ScorecardEdits;
  /** Holes whose score is in doubt, like one a scan couldn't read for sure. Their score cell is ringed. */
  toCheck?: readonly number[];
  className?: string;
}

/** Every row's height, the score's too: its hole marks and inputs fit inside it. */
const ROW = "h-8";
/** The label column, and the type every label shares. */
const LABEL = "w-18 px-2 text-left text-body-sm font-semibold whitespace-nowrap";
/** Out, In and Tot sit on the page's own tone, apart from the holes. */
const TOTAL = "bg-background p-0 text-center font-bold";
const SMALL = cn(ROW, "text-label font-medium text-muted-foreground");

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

/** A green or fairway: filled when hit, ringed when missed, a dash when the card didn't say. */
function HitMark({ hit, className }: { hit: boolean | null; className?: string }) {
  if (hit == null) return <span className="text-muted-foreground">–</span>;
  return (
    <span
      className={cn(
        "inline-block size-icon-xs rounded-full align-middle",
        hit ? "bg-primary" : "border-2 border-input",
        className,
      )}
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
      // Block, so it centres under the hole number like the rest of the column.
      className={cn("mx-auto block h-7 w-8 px-0 text-center text-sm font-semibold", className)}
    />
  );
}

/** Rings a score cell whose score is in doubt. */
const CHECK_RING = "ring-2 ring-destructive ring-offset-1 ring-offset-card";

function ScoreCell({ hole, edits, check }: { hole: HoleScore; edits?: ScorecardEdits; check: boolean }) {
  if (!edits) {
    // The one hole mark the kit draws, so a score reads the same here as on the round flow.
    return (
      <span className={cn("inline-flex align-middle", check && cn("rounded-md", CHECK_RING))}>
        <HoleShape hole={hole} />
      </span>
    );
  }
  return (
    // The fill sits behind a clear input: an input's own dark background would cover it.
    <div className={cn("mx-auto w-8 rounded-lg", hole.kind && scoreFillClass(hole.kind))}>
      <CountInput
        label={check ? `Hole ${hole.hole} strokes, to check` : `Hole ${hole.hole} strokes`}
        value={hole.strokes}
        onChange={(strokes) => edits.onStrokesChange(hole.hole, strokes)}
        className={cn(
          "bg-transparent dark:bg-transparent",
          hole.kind ? cn("border-transparent", scoreOnFillClass(hole.kind)) : "border-dashed",
          check && CHECK_RING,
          check && !hole.kind && "border-destructive",
        )}
      />
    </div>
  );
}

interface LineProps {
  front: Nine;
  back: Nine;
  label: ReactNode;
  /** The row's height and type, which its cells inherit. */
  className?: string;
  labelClassName?: string;
  cell: (hole: HoleScore) => ReactNode;
  /** Marks a hole's cell as one to check. */
  isCheck?: (hole: HoleScore) => boolean;
  /** The Out and In figures. Left out, those columns are blank. */
  nineCell?: (nine: Nine) => ReactNode;
  /** The Tot figure. */
  totCell?: ReactNode;
  totalClassName?: string;
}

/** One row: its label, a cell per hole, and the nine and round figures where the holes close. */
function Line({
  front,
  back,
  label,
  className,
  labelClassName,
  cell,
  isCheck,
  nineCell,
  totCell,
  totalClassName,
}: LineProps) {
  const holeCell = (hole: HoleScore) => (
    <td key={hole.hole} data-check={isCheck?.(hole) || undefined} className="p-0 text-center">
      {cell(hole)}
    </td>
  );
  const total = (key: string, content: ReactNode) => (
    <td key={key} className={cn(TOTAL, totalClassName)}>
      {content}
    </td>
  );
  return (
    <tr className={className}>
      <th scope="row" className={cn(LABEL, labelClassName)}>
        {label}
      </th>
      {front.holes.map(holeCell)}
      {front.holes.length > 0 && total("out", nineCell?.(front))}
      {back.holes.map(holeCell)}
      {back.holes.length > 0 && total("in", nineCell?.(back))}
      {total("tot", totCell)}
    </tr>
  );
}

/**
 * A round as one scorecard: every hole across, with Out, In and Tot where the nines close. Par, the
 * score marked the way a card marks it, to par, and the totals. Every figure is the server's, or
 * Round.previewEdits' while editing or before a scan is saved.
 *
 * Yards, handicap, putts, greens, fairways and shots-to-green appear only when a hole has them (putts
 * and greens always do while editing), because a scanned card often has none, and a row of dashes
 * reads as a failed scan rather than a card that never held the data.
 */
function ScorecardTable({ round, teeBox, edits, toCheck, className }: ScorecardTableProps) {
  const { frontNine: front, backNine: back } = round;
  const holes = [...front.holes, ...back.holes];
  const showYards = holes.some((hole) => hole.yardage != null);
  const showHandicap = holes.some((hole) => hole.handicap != null);
  const showPutts = edits != null || holes.some((hole) => hole.putts != null);
  const showGir = edits != null || holes.some((hole) => hole.gir != null);
  const showFairway = holes.some((hole) => hole.fairway != null);
  const showShots = holes.some((hole) => hole.shotsToGreen != null);
  const line = { front, back };
  const figures = "text-body font-medium text-foreground-secondary";

  return (
    <table data-slot="scorecard-table" className={cn("w-full table-fixed border-collapse", className)}>
      <tbody className="divide-y divide-border border-b border-border">
        <tr className={cn(ROW, "bg-background text-body-sm font-bold text-foreground-secondary")}>
          <th scope="row" className={LABEL}>
            Hole
          </th>
          {front.holes.map((hole) => (
            <td key={hole.hole} className="p-0 text-center">
              {hole.hole}
            </td>
          ))}
          {front.holes.length > 0 && <td className="p-0 text-center">Out</td>}
          {back.holes.map((hole) => (
            <td key={hole.hole} className="p-0 text-center">
              {hole.hole}
            </td>
          ))}
          {back.holes.length > 0 && <td className="p-0 text-center">In</td>}
          <td className="p-0 text-center">Tot</td>
        </tr>

        {showYards && (
          <Line
            {...line}
            label={teeBox || "Yards"}
            className={SMALL}
            labelClassName="capitalize text-muted-foreground"
            cell={(hole) => show(hole.yardage)}
            nineCell={(nine) => show(nine.yards)}
            totCell={show(round.yards)}
            totalClassName="font-medium"
          />
        )}

        {showHandicap && (
          <Line
            {...line}
            label="Hcp"
            className={SMALL}
            labelClassName="text-muted-foreground"
            cell={(hole) => show(hole.handicap)}
          />
        )}

        <Line
          {...line}
          label="Par"
          className={cn(ROW, figures)}
          labelClassName="text-foreground-secondary"
          cell={(hole) => show(hole.par)}
          nineCell={(nine) => show(nine.par)}
          totCell={show(round.par)}
        />

        <Line
          {...line}
          label="Score"
          className={cn(ROW, "text-body font-bold text-foreground", edits && "bg-muted/recessed")}
          labelClassName="text-foreground"
          cell={(hole) => <ScoreCell hole={hole} edits={edits} check={!!toCheck?.includes(hole.hole)} />}
          isCheck={(hole) => !!toCheck?.includes(hole.hole)}
          nineCell={(nine) => show(nine.total)}
          totCell={show(round.score)}
          totalClassName="text-base"
        />

        <Line
          {...line}
          label="To par"
          className={cn(ROW, "text-label font-semibold")}
          labelClassName="text-muted-foreground"
          cell={(hole) => <span className={toParTextClass(hole.toPar)}>{toParDisplay(hole.toPar, "-")}</span>}
          nineCell={(nine) => <span className={toParTextClass(nine.toPar)}>{toParDisplay(nine.toPar, "-")}</span>}
          totCell={<span className={toParTextClass(round.toPar)}>{toParDisplay(round.toPar, "-")}</span>}
        />

        {showPutts && (
          <Line
            {...line}
            label="Putts"
            className={cn(ROW, figures, edits && "bg-muted/recessed")}
            labelClassName="text-foreground-secondary"
            cell={(hole) =>
              edits ? (
                <CountInput
                  label={`Hole ${hole.hole} putts`}
                  value={hole.putts}
                  onChange={(putts) => edits.onPuttsChange(hole.hole, putts)}
                  className="h-6 text-xs font-normal"
                />
              ) : (
                <span className={cn(hole.threePutt && "font-bold text-destructive")}>{hole.putts ?? "·"}</span>
              )
            }
            nineCell={(nine) => show(nine.putts)}
            totCell={show(round.putts)}
          />
        )}

        {showGir && (
          <Line
            {...line}
            label="GIR"
            className={cn(ROW, figures)}
            labelClassName="text-foreground-secondary"
            cell={(hole) =>
              edits ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Hole ${hole.hole} green: ${GIR_WORD.get(hole.gir)}`}
                  onClick={() => edits.onGirChange(hole.hole, NEXT_GIR.get(hole.gir) ?? null)}
                  className="mx-auto"
                >
                  <HitMark hit={hole.gir} className="size-3" />
                </Button>
              ) : (
                <HitMark hit={hole.gir} />
              )
            }
            nineCell={(nine) => show(nine.gir)}
            totCell={show(round.gir)}
          />
        )}

        {showFairway && (
          <Line
            {...line}
            label="Fairway"
            className={cn(ROW, figures)}
            labelClassName="text-foreground-secondary"
            cell={(hole) => <HitMark hit={hole.fairway} />}
          />
        )}

        {showShots && (
          <Line
            {...line}
            label="S2G"
            className={SMALL}
            labelClassName="text-muted-foreground"
            cell={(hole) => show(hole.shotsToGreen)}
          />
        )}
      </tbody>
    </table>
  );
}

export { ScorecardTable };
