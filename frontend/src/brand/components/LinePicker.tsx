import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cn } from "@/brand/cn";
import { scoreMarkClass } from "@/brand/theme";
import type { ScoreKind } from "@/domain/score";
import { toggleVariants } from "./variants";

interface LineOption<T extends string> {
  value: T;
  /** "Score", "Birdies", "Triples+". */
  label: string;
  /** The line's colour on the chart: a score kind's, or the brand's for the chart's own figure. */
  swatch: ScoreKind | "primary";
}

interface LinePickerProps<T extends string> {
  options: readonly LineOption<T>[];
  /** The lines turned on, in any order. */
  value: readonly T[];
  /** The lines on, in the options' order. */
  onChange: (value: T[]) => void;
  /** What the row turns on, named for screen readers and shown before the chips. */
  label: string;
  className?: string;
}

/**
 * Turns a chart's lines on and off: a row of pill chips, each the line's colour and name, any number
 * pressed. The same ringed chip as `TeePicker`, so the colour reads whether it's on or off.
 */
function LinePicker<T extends string>({ options, value, onChange, label, className }: LinePickerProps<T>) {
  return (
    <div data-slot="line-picker" className={cn("flex flex-wrap items-center gap-2", className)}>
      <span aria-hidden className="mr-0.5 text-body font-semibold text-foreground-secondary">
        {label}
      </span>
      <ToggleGroupPrimitive
        aria-label={label}
        multiple
        value={[...value]}
        onValueChange={(values: string[]) => onChange(options.flatMap((option) => (values.includes(option.value) ? [option.value] : [])))}
        className="flex flex-wrap items-center gap-2"
      >
        {options.map((option) => (
          <TogglePrimitive
            key={option.value}
            value={option.value}
            className={cn(toggleVariants({ variant: "ringedChip" }), "pr-3 pl-2.5")}
          >
            <span
              aria-hidden
              className={cn("size-3 rounded-full", option.swatch === "primary" ? "bg-primary" : scoreMarkClass(option.swatch))}
            />
            {option.label}
          </TogglePrimitive>
        ))}
      </ToggleGroupPrimitive>
    </div>
  );
}

export { LinePicker };
export type { LineOption, LinePickerProps };
