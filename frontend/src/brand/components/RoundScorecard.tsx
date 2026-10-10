import { cn } from "@/brand/cn";
import { HoleShape } from "@/brand/charts/HoleScoreShapes";
import { Input } from "@/brand/components/Input";
import { scoreFillClass, scoreOnFillClass, toParDisplay, toParTextClass } from "@/brand/theme";
import { isThreePutt, type HoleScore, type Nine, type Round } from "@/domain";
import { formatCourseName } from "@/lib/courseName";

export interface RoundScorecardEdits {
  onStrokesChange: (hole: number, strokes: number | null) => void;
  onPuttsChange: (hole: number, putts: number | null) => void;
  onGirChange: (hole: number, gir: boolean | null) => void;
}

interface RoundScorecardProps {
  round: Round;
  /** The tee played, which names the yardage row. */
  teeBox?: string | null;
  /** Makes scores, putts and greens editable. The round shown should already carry the edits. */
  edits?: RoundScorecardEdits;
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

function ScoreCell({ hole, edits }: { hole: HoleScore; edits?: RoundScorecardEdits }) {
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
        className={hole.kind ? cn("border-transparent", scoreFillClass(hole.kind), scoreOnFillClass(hole.kind)) : "border-dashed"}
      />
    </td>
  );
}

function NineTable({
  nine,
  label,
  round,
  teeBox,
  edits,
}: {
  nine: Nine;
  label: string;
  /** The round, when this nine closes it and carries the TOT column. */
  round?: Round;
  teeBox?: string | null;
  edits?: RoundScorecardEdits;
}) {
  const holes = nine.holes;
  return (
    <table className="w-full border-collapse">
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
        <tr className="text-xs text-muted-foreground">
          <td className={cn(LABEL_CELL, "capitalize")}>{teeBox || "Yards"}</td>
          {holes.map((hole) => (
            <td key={hole.hole} className={CELL}>{show(hole.yardage)}</td>
          ))}
          <td className={NINE_CELL}>{show(nine.yards)}</td>
          {round && <td className={TOTAL_CELL}>{show(round.yards)}</td>}
        </tr>

        <tr className="text-xs text-muted-foreground">
          <td className={LABEL_CELL}>Hcp</td>
          {holes.map((hole) => (
            <td key={hole.hole} className={CELL}>{show(hole.handicap)}</td>
          ))}
          <td className={NINE_CELL} />
          {round && <td className={TOTAL_CELL} />}
        </tr>

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

        <tr className="text-xs">
          <td className={cn(LABEL_CELL, "text-primary")}>GIR</td>
          {holes.map((hole) =>
            edits ? (
              <td key={hole.hole} className="px-1 py-1 text-center">
                <button
                  type="button"
                  aria-label={`Hole ${hole.hole} green: ${GIR_WORD.get(hole.gir)}`}
                  onClick={() => edits.onGirChange(hole.hole, NEXT_GIR.get(hole.gir) ?? null)}
                  className="mx-auto flex size-7 items-center justify-center rounded-md hover:bg-muted"
                >
                  <GirMark gir={hole.gir} className="size-3" />
                </button>
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
      </tbody>
    </table>
  );
}

/**
 * A round as a scorecard: yards, handicap and par per hole, then the score marked the way a
 * card marks it, to par, putts and greens, with each nine's and the round's totals. Every
 * figure is the server's (or Round.previewEdits' while editing). Wider than a phone, so it
 * scrolls sideways.
 */
function RoundScorecard({ round, teeBox, edits, className }: RoundScorecardProps) {
  const nines = [
    { nine: round.frontNine, label: "OUT" },
    { nine: round.backNine, label: "IN" },
  ].filter(({ nine }) => nine.holes.length > 0);

  return (
    <div
      data-slot="round-scorecard"
      className={cn("overflow-x-auto rounded-card border border-border bg-card shadow-sm", className)}
    >
      <div className="min-w-scorecard">
        <div className="bg-primary px-4 py-3 text-primary-foreground">
          <div className="text-base font-bold">{formatCourseName(round.course?.name)}</div>
          {round.course?.location && <div className="text-xs opacity-60">{round.course.location}</div>}
        </div>
        {nines.map(({ nine, label }, i) => (
          <div key={label}>
            {i > 0 && (
              <div className="flex items-center gap-3 border-y border-border bg-muted/60 px-4 py-1.5">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Back Nine
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            <NineTable
              nine={nine}
              label={label}
              round={i === nines.length - 1 ? round : undefined}
              teeBox={teeBox}
              edits={edits}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export { RoundScorecard };
