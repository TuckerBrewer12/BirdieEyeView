import { Check } from "lucide-react";
import { cn } from "@/brand/cn";
import { tokens } from "@/brand/theme";
import { Card } from "./Card";

interface ScanProgressProps {
  /** What is happening, as the card's title. */
  label: string;
  /** The steps of reading a card, in order. */
  steps: readonly string[];
  /** Index of the step running: earlier ones are done, later ones still to come. */
  phase: number;
  className?: string;
}

type StepState = "done" | "now" | "next";

const { box, radius } = tokens.spinner;
const centre = box / 2;

const STEP_TEXT: Record<StepState, string> = {
  done: "font-medium text-foreground-secondary",
  now: "font-semibold text-foreground",
  next: "font-medium text-muted-foreground",
};

const STEP_MARK: Record<StepState, string> = {
  done: "border-primary bg-primary text-primary-foreground",
  now: "border-primary bg-card",
  next: "border-border-strong bg-card",
};

/**
 * A scan in flight: the card being read, and which step of reading it is running.
 *
 * Pure: which step is running is the caller's business, so the same card
 * serves the landing page's demo and the signed-in scan flow without either
 * owning a timer the other cannot see.
 */
function ScanProgress({ label, steps, phase, className }: ScanProgressProps) {
  return (
    <Card
      data-slot="scan-progress"
      role="status"
      aria-live="polite"
      className={cn("gap-3 p-5", className)}
    >
      <div className="flex items-center gap-3">
        <svg
          aria-hidden
          viewBox={`0 0 ${box} ${box}`}
          className="size-9 shrink-0 animate-spin motion-reduce:animate-none"
        >
          <circle cx={centre} cy={centre} r={radius} fill="none" stroke={tokens.color.muted} strokeWidth={tokens.lineWidth.ring} />
          <path
            d={`M${centre} ${centre - radius} A${radius} ${radius} 0 0 1 ${centre + radius} ${centre}`}
            fill="none"
            stroke={tokens.color.primary}
            strokeWidth={tokens.lineWidth.ring}
            strokeLinecap="round"
          />
        </svg>
        <p className="text-lg font-bold text-foreground">{label}</p>
      </div>

      <ol className="flex flex-col gap-3">
        {steps.map((step, i) => {
          const state: StepState = i < phase ? "done" : i === phase ? "now" : "next";
          return (
            <li
              key={step}
              data-state={state}
              aria-current={state === "now" ? "step" : undefined}
              className={cn("flex items-center gap-2 text-sm", STEP_TEXT[state])}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  STEP_MARK[state],
                )}
              >
                {state === "done" && <Check className="size-3 stroke-icon-active" />}
              </span>
              {step}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

export { ScanProgress };
