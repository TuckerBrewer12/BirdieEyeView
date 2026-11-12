import { HoleShape } from "@/brand/charts/HoleScoreShapes";
import { cn } from "@/brand/cn";
import { Button } from "@/brand/components/Button";
import { Input } from "@/brand/components/Input";
import { ScorecardGrid, type ScorecardRow } from "@/brand/components/ScorecardGrid";
import { formatScorecardFigure as show } from "@/domain/format";
import { TeeSwatch } from "@/brand/components/TeeSwatch";
import { scoreFillClass, scoreOnFillClass } from "@/brand/theme";
import { ToParFigure } from "@/brand/components/ToParFigure";
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
  /**
   * Draws one nine, closed by its own total, as a phone shows the card: two of these stacked, front
   * then back, in place of the one wide table. Left out, every hole is across with Out, In and Tot.
   */
  nine?: "front" | "back";
  className?: string;
}

/** Row heights by what the row holds: the score's marks get the most room, the reference rows the least. */
const ROW = { figures: "h-8", small: "h-7", score: "h-11" } as const;
const SMALL = cn(ROW.small, "text-label font-medium text-muted-foreground");

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
      className={cn("mx-auto block h-7 w-7 px-0 text-center text-sm font-semibold", className)}
    />
  );
}

/** Rings a score cell whose score is in doubt. */
const CHECK_RING = "ring-2 ring-destructive ring-offset-1 ring-offset-card";

function ScoreCell({
  hole,
  edits,
  check,
}: {
  hole: HoleScore;
  edits?: ScorecardEdits;
  check: boolean;
}) {
  if (!edits) {
    // The one hole mark the kit draws, so a score reads the same here as on the round flow.
    return (
      <span className={cn("inline-flex align-middle", check && cn("rounded-md", CHECK_RING))}>
        {/* A phone's nine is too narrow for the large mark. */}
        <HoleShape hole={hole} square size="scorecard" />
      </span>
    );
  }
  return (
    // The fill sits behind a clear input: an input's own dark background would cover it.
    <div className={cn("mx-auto w-7 rounded-lg", hole.kind && scoreFillClass(hole.kind))}>
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

/**
 * A round as one scorecard: every hole across, with Out, In and Tot where the nines close. Par, the
 * score marked the way a card marks it, to par, and the totals. Every figure is the server's, or
 * Round.previewEdits' while editing or before a scan is saved.
 *
 * Yards, handicap, putts, greens, fairways and shots-to-green appear only when a hole has them (putts
 * and greens always do while editing), because a scanned card often has none, and a row of dashes
 * reads as a failed scan rather than a card that never held the data.
 */
function ScorecardTable({ round, teeBox, edits, toCheck, nine, className }: ScorecardTableProps) {
  const { frontNine, backNine } = round;
  const shown = nine === "front" ? [frontNine] : nine === "back" ? [backNine] : [frontNine, backNine];
  const nines = shown.filter((part) => part.holes.length > 0);
  const holes = nines.flatMap((part) => part.holes);
  const figures = "text-body-sm font-medium text-foreground-secondary";
  const optional = {
    yards: holes.some((hole) => hole.yardage != null),
    handicap: holes.some((hole) => hole.handicap != null),
    putts: edits != null || holes.some((hole) => hole.putts != null),
    gir: edits != null || holes.some((hole) => hole.gir != null),
    fairway: holes.some((hole) => hole.fairway != null),
    shots: holes.some((hole) => hole.shotsToGreen != null),
  };

  const rows: (ScorecardRow<HoleScore, Nine> | false)[] = [
    optional.yards && {
      key: "yards",
      label: teeBox ? (
        <span className="inline-flex items-center gap-1.5 capitalize">
          <TeeSwatch color={teeBox} className="size-2 shrink-0 rounded-full" />
          {teeBox}
        </span>
      ) : (
        "Yards"
      ),
      className: cn(SMALL, "text-caption md:text-label"),
      labelClassName: "text-muted-foreground",
      cell: (hole) => show(hole.yardage),
      nine: (part) => show(part.yards),
      tot: show(round.yards),
    },
    // A phone's nine has no room for the stroke index; the wide card keeps it.
    optional.handicap && {
      key: "handicap",
      label: "Hcp",
      wideOnly: true,
      className: SMALL,
      labelClassName: "text-muted-foreground",
      cell: (hole) => show(hole.handicap),
    },
    {
      key: "par",
      label: "Par",
      className: cn(ROW.figures, figures),
      labelClassName: "text-foreground-secondary",
      cell: (hole) => show(hole.par),
      nine: (part) => show(part.par),
      tot: show(round.par),
    },
    {
      key: "score",
      label: "Score",
      className: cn(ROW.score, "text-body font-semibold text-foreground", edits && "bg-muted/recessed"),
      labelClassName: "text-foreground",
      cell: (hole) => <ScoreCell hole={hole} edits={edits} check={!!toCheck?.includes(hole.hole)} />,
      isCheck: (hole) => !!toCheck?.includes(hole.hole),
      nine: (part) => show(part.total),
      tot: show(round.score),
    },
    {
      key: "to-par",
      label: "To par",
      className: cn(ROW.small, "text-label font-semibold"),
      labelClassName: "text-muted-foreground",
      cell: (hole) => <ToParFigure toPar={hole.toPar} size="inherit" empty="-" />,
      nine: (part) => <ToParFigure toPar={part.toPar} size="inherit" empty="-" />,
      tot: <ToParFigure toPar={round.toPar} size="inherit" empty="-" />,
    },
    optional.putts && {
      key: "putts",
      label: "Putts",
      className: cn(ROW.figures, figures, edits && "bg-muted/recessed"),
      labelClassName: "text-foreground-secondary",
      cell: (hole) =>
        edits ? (
          <CountInput
            label={`Hole ${hole.hole} putts`}
            value={hole.putts}
            onChange={(putts) => edits.onPuttsChange(hole.hole, putts)}
            className="h-6 w-6 text-xs font-normal"
          />
        ) : (
          <span className={cn(hole.threePutt && "font-bold text-destructive")}>{hole.putts ?? "·"}</span>
        ),
      nine: (part) => show(part.putts),
      tot: show(round.putts),
    },
    optional.gir && {
      key: "gir",
      label: "GIR",
      className: cn(ROW.figures, figures),
      labelClassName: "text-foreground-secondary",
      cell: (hole) =>
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
        ),
      nine: (part) => show(part.gir),
      tot: show(round.gir),
    },
    optional.fairway && {
      key: "fairway",
      label: "Fairway",
      className: cn(ROW.figures, figures),
      labelClassName: "text-foreground-secondary",
      cell: (hole) => <HitMark hit={hole.fairway} />,
    },
    optional.shots && {
      key: "shots",
      label: "S2G",
      className: SMALL,
      labelClassName: "text-muted-foreground",
      cell: (hole) => show(hole.shotsToGreen),
    },
  ];

  return (
    <ScorecardGrid
      nines={nines}
      nineLabel={(part) => (part === backNine ? "In" : "Out")}
      withTot={nine == null}
      rows={rows.filter((row) => row !== false)}
      className={className}
    />
  );
}

export { ScorecardTable };
