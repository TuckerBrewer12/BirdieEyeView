import { Check } from "lucide-react";
import { cn } from "@/brand/cn";
import { tokens } from "@/brand/theme";

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
    <div
      data-slot="scan-progress"
      role="status"
      aria-live="polite"
      className={cn("flex flex-col gap-3.5 rounded-xl border border-border bg-card p-5", className)}
    >
      <div className="flex items-center gap-3">
        <svg aria-hidden viewBox="0 0 36 36" className="size-9 shrink-0 animate-spin motion-reduce:animate-none">
          <circle cx="18" cy="18" r="14" fill="none" stroke={tokens.color.muted} strokeWidth="4" />
          <path
            d="M18 4 A14 14 0 0 1 32 18"
            fill="none"
            stroke={tokens.color.primary}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
        <p className="text-lg font-bold text-foreground">{label}</p>
      </div>

      <ol className="flex flex-col gap-3.5">
        {steps.map((step, i) => {
          const state: StepState = i < phase ? "done" : i === phase ? "now" : "next";
          return (
            <li
              key={step}
              data-state={state}
              aria-current={state === "now" ? "step" : undefined}
              className={cn("flex items-center gap-2.5 text-sm", STEP_TEXT[state])}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-4.5 shrink-0 items-center justify-center rounded-full border-2",
                  STEP_MARK[state],
                )}
              >
                {state === "done" && <Check className="size-3 stroke-3" />}
              </span>
              {step}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export { ScanProgress };
