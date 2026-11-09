import { cn } from "@/brand/cn";
import { tokens } from "@/brand/theme";
import { formatPercent } from "@/domain/format";

interface ProgressRingProps {
  /** Percent of the way, 0–100. Null draws the empty track. */
  value: number | null;
  /** The phone's heavier stroke, for a ring drawn smaller. */
  thick?: boolean;
  /** What the ring measures, for a screen reader: "Progress to break 80". */
  label: string;
  className?: string;
}

const G = tokens.chart.progressRing;

/** How far along a goal is, as a ring filling clockwise from the top. */
export function ProgressRing({ value, thick = false, label, className }: ProgressRingProps) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  const circumference = 2 * Math.PI * G.radius;
  const centre = G.size / 2;
  const stroke = thick ? G.strokeThick : G.stroke;

  return (
    <svg
      data-slot="progress-ring"
      viewBox={`0 0 ${G.size} ${G.size}`}
      role="img"
      aria-label={`${label}: ${formatPercent(pct)}`}
      className={cn("shrink-0", className)}
    >
      <circle cx={centre} cy={centre} r={G.radius} fill="none" stroke={tokens.color.chart.grid} strokeWidth={stroke} />
      {pct > 0 && (
        <circle
          cx={centre}
          cy={centre}
          r={G.radius}
          fill="none"
          stroke={tokens.color.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(circumference * pct) / 100} ${circumference}`}
          transform={`rotate(-90 ${centre} ${centre})`}
        />
      )}
    </svg>
  );
}
