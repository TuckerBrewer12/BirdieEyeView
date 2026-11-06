import { useState, type PointerEvent } from "react";
import { cn } from "@/brand/cn";
import { scoreKindLabel, toParLabel, tokens } from "@/brand/theme";
import { scoreKind, type ScoreKind } from "@/domain/score";

interface ScoreTargetShot {
  toPar: number;
  label?: string;
}

interface ScoreTargetChartProps {
  shots: ScoreTargetShot[];
  className?: string;
  "aria-label"?: string;
}

type Ring = Exclude<ScoreKind, "quad">;

const RINGS: Ring[] = ["triple", "double", "bogey", "par", "birdie", "eagle"];

/** Where a kind's ring starts and ends, as shares of the tokens.radius. Quads land in the triple ring. */
function ringBand(kind: ScoreKind): [number, number] {
  const { rings } = tokens.chart.target;
  const ring: Ring = kind === "quad" ? "triple" : kind;
  const index = RINGS.indexOf(ring);
  const inner = index === RINGS.length - 1 ? 0 : rings[RINGS[index + 1]];
  return [inner, rings[ring]];
}

function ringPath(c: number, inner: number, outer: number): string {
  const disc = (r: number, sweep: 0 | 1) =>
    `M ${c + r} ${c} A ${r} ${r} 0 1 ${sweep} ${c - r} ${c} A ${r} ${r} 0 1 ${sweep} ${c + r} ${c} Z`;
  return inner === 0 ? disc(outer, 0) : `${disc(outer, 0)} ${disc(inner, 1)}`;
}

export function ScoreTargetChart({ shots, className, "aria-label": ariaLabel }: ScoreTargetChartProps) {
  const { size, stroke, dot, dotHover, hitRadius } = tokens.chart.target;
  const c = size / 2;
  const [active, setActive] = useState<number | null>(null);

  const dots = shots.map((shot, i) => {
    const kind = scoreKind(shot.toPar, 0)!;
    const [inner, outer] = ringBand(kind);
    const r = (inner + (((i * 1234567891) % 1000) / 1000) * (outer - inner)) * c;
    const theta = (((i * 2654435761) % 1000) / 1000) * Math.PI * 2;
    return { ...shot, kind, cx: c + r * Math.cos(theta), cy: c + r * Math.sin(theta) };
  });

  const pick = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) * (size / rect.width);
    const py = (event.clientY - rect.top) * (size / rect.height);
    let nearest: number | null = null;
    let best = hitRadius;
    dots.forEach((d, i) => {
      const distance = Math.hypot(d.cx - px, d.cy - py);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    });
    return nearest;
  };

  const shown = active != null ? dots[active] : null;

  return (
    <div data-slot="score-target-chart" className={cn("relative mx-auto aspect-square w-full max-w-target", className)}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="block size-full overflow-visible"
        role="img"
        aria-label={ariaLabel}
        onPointerMove={(event) => setActive(pick(event))}
        onPointerLeave={() => setActive(null)}
      >
        {RINGS.map((ring) => {
          const [inner, outer] = ringBand(ring);
          return (
            <path
              key={ring}
              d={ringPath(c, inner * c, outer * c)}
              fillRule="evenodd"
              fill={tokens.color.score[ring].base}
              fillOpacity={tokens.opacity.wash}
              stroke={tokens.color.score[ring].base}
              strokeWidth={stroke}
            />
          );
        })}
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.cx}
            cy={d.cy}
            r={active === i ? dotHover : dot}
            fill={tokens.color.score[d.kind].base}
            stroke={tokens.color.card}
            strokeWidth={tokens.lineWidth.outline}
          />
        ))}
      </svg>
      {shots.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-md bg-card px-2 py-0.5 text-xs text-muted-foreground shadow-card">No holes yet</span>
        </div>
      )}
      {shown && (
        <div
          data-slot="score-target-tooltip"
          className={cn(
            "pointer-events-none absolute z-10 -translate-y-full rounded-xl border border-border bg-card/glass px-3 py-2 text-xs shadow-card",
            shown.cx > c ? "-ml-3 -translate-x-full" : "ml-3",
          )}
          style={{ left: `${(shown.cx / size) * 100}%`, top: `${(shown.cy / size) * 100}%` }}
        >
          {shown.label && <div className="font-semibold text-card-foreground">{shown.label}</div>}
          <div className="text-muted-foreground">
            {scoreKindLabel(shown.kind)} · {toParLabel(shown.toPar)}
          </div>
        </div>
      )}
    </div>
  );
}

export type { ScoreTargetChartProps, ScoreTargetShot };
