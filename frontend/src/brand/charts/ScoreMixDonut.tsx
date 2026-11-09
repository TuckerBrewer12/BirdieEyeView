import { arc, pie, type PieArcDatum } from "d3-shape";
import { cn } from "@/brand/cn";
import { scoreFillClass, tokens } from "@/brand/theme";
import type { ScoreMix } from "@/domain/score";
import { scoreMixEntries, type ScoreMixEntry } from "./scoreMixEntries";

interface ScoreMixDonutProps {
  /** Each kind's share of the holes. */
  mix: ScoreMix;
  className?: string;
}

const { size, outer, inner, padAngle, corner } = tokens.chart.donut;
const VIEW_BOX = `${-size / 2} ${-size / 2} ${size} ${size}`;

/** How a player's holes split across score kinds: a ring of slices with a hollow centre, the shares beside it. */
export function ScoreMixDonut({ mix, className }: ScoreMixDonutProps) {
  const entries = scoreMixEntries(mix);
  if (entries.length === 0) return null;

  // Slices keep score order, eagle first, clockwise from the top.
  const slices = pie<ScoreMixEntry>()
    .value((entry) => mix[entry.kind])
    .sortValues(null)
    .padAngle(padAngle)(entries);
  const slice = arc<PieArcDatum<ScoreMixEntry>>().innerRadius(inner).outerRadius(outer).cornerRadius(corner);

  return (
    <div data-slot="score-mix-donut" className={cn("flex items-center gap-3", className)}>
      <svg
        viewBox={VIEW_BOX}
        role="img"
        aria-label={`Score mix: ${entries.map((entry) => `${entry.figure} ${entry.word}`).join(", ")}`}
        className="size-16 shrink-0"
      >
        {slices.map((s) => (
          <path key={s.data.kind} d={slice(s) ?? ""} fill={tokens.color.score[s.data.kind].base} />
        ))}
      </svg>
      <ul aria-hidden className="flex flex-col gap-1 text-body-sm text-foreground-secondary">
        {entries.map((entry) => (
          <li key={entry.kind} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className={cn("size-2 shrink-0 rounded-full", scoreFillClass(entry.kind))} />
            <span>
              <b className="font-semibold text-foreground">{entry.figure}</b> {entry.word}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
