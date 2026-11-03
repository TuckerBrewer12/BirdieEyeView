import type { ReactNode } from "react";
import { cn } from "@/brand/cn";
import { tokens } from "@/brand/theme";
import { formatPercent } from "@/domain/format";

interface ProgressRingProps {
  /** Percent of the way round, 0 to 100. Null draws an empty ring. */
  value: number | null;
  /** Names what is measured, for screen readers: "Goal progress". */
  "aria-label": string;
  /** The middle of the ring. Defaults to the percent. */
  children?: ReactNode;
  className?: string;
}

/** How far along a goal is: a ring filled clockwise from the top, the figure in the middle. */
export function ProgressRing({ value, children, className, "aria-label": ariaLabel }: ProgressRingProps) {
  const { size, radius, stroke } = tokens.chart.progressRing;
  const mid = size / 2;
  const percent = Math.min(100, Math.max(0, value ?? 0));

  return (
    <div
      data-slot="progress-ring"
      role="meter"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn("relative size-18 shrink-0", className)}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="block size-full" aria-hidden>
        <circle cx={mid} cy={mid} r={radius} fill="none" stroke={tokens.color.muted} strokeWidth={stroke} />
        {percent > 0 && (
          <circle
            cx={mid}
            cy={mid}
            r={radius}
            fill="none"
            stroke={tokens.color.primary}
            strokeWidth={stroke}
            strokeLinecap="round"
            // Measured against a path of 100, so the dash is the percent itself.
            pathLength={100}
            strokeDasharray={`${percent} 100`}
            transform={`rotate(-90 ${mid} ${mid})`}
          />
        )}
      </svg>
      <div aria-hidden className="absolute inset-0 flex items-center justify-center text-base font-bold text-foreground">
        {children ?? formatPercent(value == null ? null : percent)}
      </div>
    </div>
  );
}

export type { ProgressRingProps };
