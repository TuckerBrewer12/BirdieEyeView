import { HoleShape } from "@/brand/charts/HoleScoreShapes";
import { cn } from "@/brand/cn";
import { Button } from "@/brand/components/Button";
import { Input } from "@/brand/components/Input";
import { ScorecardGrid, type ScorecardRow } from "@/brand/components/ScorecardGrid";
import { formatScorecardFigure as show } from "@/domain/format";
import { TeeSwatch } from "@/brand/components/TeeSwatch";
import { scoreFillClass, scoreOnFillClass } from "@/brand/theme";
import { ToParFigure } from "@/brand/components/ToParFigure";
import { teeNameParts, type HoleScore, type Nine, type Round } from "@/domain";

export interface ScorecardEdits {
  onStrokesChange: (hole: number, strokes: number | null) => void;
  onPuttsChange: (hole: number, putts: number | null) => void;
  onGirChange: (hole: number, gir: boolean | null) => void;
}

interface ScorecardTableProps {
  round: Round;
  teeBox?: string | null;
  edits?: ScorecardEdits;
  toCheck?: readonly number[];
  nine?: "front" | "back";
  className?: string;
}

const ROW = { figures: "h-8", small: "h-7", score: "h-11" } as const;
const SMALL = cn(ROW.small, "text-label font-medium text-muted-foreground");

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
      className={cn("mx-auto block h-7 w-7 rounded-lg px-0 text-center text-sm font-semibold md:text-sm", className)}
    />
  );
}

const CHECK_RING = "ring-2 ring-status-warning ring-offset-1 ring-offset-card";

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
    return (
      <span className={cn("inline-flex align-middle", check && cn("rounded-md", CHECK_RING))}>
        <HoleShape hole={hole} square size="scorecard" />
      </span>
    );
  }
  return (
    <div className={cn("mx-auto w-7 rounded-lg", hole.kind && scoreFillClass(hole.kind))}>
      <CountInput
        label={check ? `Hole ${hole.hole} strokes, to check` : `Hole ${hole.hole} strokes`}
        value={hole.strokes}
        onChange={(strokes) => edits.onStrokesChange(hole.hole, strokes)}
        className={cn(
          "bg-transparent dark:bg-transparent",
          hole.kind ? cn("border-transparent", scoreOnFillClass(hole.kind)) : "border-dashed",
          check && CHECK_RING,
          check && !hole.kind && "border-status-warning",
        )}
      />
    </div>
  );
}

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
      label: teeBox ? <TeeLabel teeBox={teeBox} /> : "Yards",
      className: cn(SMALL, "text-caption md:text-label"),
      labelClassName: "text-muted-foreground",
      cell: (hole) => show(hole.yardage),
      nine: (part) => show(part.yards),
      tot: show(round.yards),
    },
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

function TeeLabel({ teeBox }: { teeBox: string }) {
  const { name, rating } = teeNameParts(teeBox);
  return (
    <span className="inline-flex items-center gap-1.5">
      <TeeSwatch color={teeBox} className="size-2 shrink-0 rounded-full" />
      <span className="flex flex-col leading-tight">
        <span>{name}</span>
        {rating && <span className="hidden text-caption font-medium text-muted-foreground md:block">{rating}</span>}
      </span>
    </span>
  );
}
