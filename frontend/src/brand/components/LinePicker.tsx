import { cn } from "@/brand/cn";
import { scoreMarkClass } from "@/brand/theme";
import type { ScoreKind } from "@/domain/score";
import { SwatchChips } from "./SwatchChips";

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

/** Turns a chart's lines on and off: `SwatchChips`, each the line's colour and name, any number on. */
function LinePicker<T extends string>({ options, value, onChange, label, className }: LinePickerProps<T>) {
  return (
    <SwatchChips
      multiple
      label={label}
      className={className}
      value={value}
      onChange={onChange}
      chips={options.map((option) => ({
        value: option.value,
        label: option.label,
        swatch: (
          <span
            aria-hidden
            className={cn("size-3 rounded-full", option.swatch === "primary" ? "bg-primary" : scoreMarkClass(option.swatch))}
          />
        ),
      }))}
    />
  );
}

export { LinePicker };
export type { LineOption, LinePickerProps };
