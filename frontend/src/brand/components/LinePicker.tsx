import { cn } from "@/brand/cn";
import { scoreMarkClass } from "@/brand/theme";
import type { ScoreKind } from "@/domain/score";
import { SwatchChips } from "./SwatchChips";

interface LineOption<T extends string> {
  value: T;
  label: string;
  swatch: ScoreKind | "primary";
}

interface LinePickerProps<T extends string> {
  options: readonly LineOption<T>[];
  value: readonly T[];
  onChange: (value: T[]) => void;
  label: string;
  className?: string;
}

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
