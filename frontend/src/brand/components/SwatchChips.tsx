import type { ReactNode } from "react";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cn } from "@/brand/cn";
import { toggleVariants } from "./variants";

interface SwatchChip<T extends string> {
  value: T;
  /** The chip's name, which is also its name for screen readers. */
  label: string;
  /** The colour it stands for, before the name: a tee's swatch, a line's dot. */
  swatch: ReactNode;
  /** A quieter figure after the name: a tee's yardage. */
  detail?: string | null;
}

interface SwatchChipsProps<T extends string> {
  chips: readonly SwatchChip<T>[];
  /** The chips pressed. */
  value: readonly T[];
  /** The chips pressed after a press, in the chips' order. */
  onChange: (value: T[]) => void;
  /** Any number pressed. Without it one is, and pressing it again keeps it. */
  multiple?: boolean;
  /** What the row picks, named for screen readers and shown before the chips. */
  label: string;
  /** Leaves the label for screen readers alone, when a `FieldLabel` above already shows it. */
  hideLabel?: boolean;
  className?: string;
}

/**
 * A row of pill chips that each carry a colour: ringed in ink when pressed rather than filled, so
 * the colour reads either way. `ToggleGroup look="chips"` is the filled kind, for chips without a
 * colour of their own. Arrow keys move between the chips. `TeePicker` and `LinePicker` sit on it.
 */
function SwatchChips<T extends string>({
  chips,
  value,
  onChange,
  multiple = false,
  label,
  hideLabel = false,
  className,
}: SwatchChipsProps<T>) {
  return (
    <div data-slot="swatch-chips" className={cn("flex flex-wrap items-center gap-2", className)}>
      {!hideLabel && (
        <span aria-hidden className="mr-0.5 text-body font-semibold text-foreground-secondary">
          {label}
        </span>
      )}
      <ToggleGroupPrimitive
        aria-label={label}
        multiple={multiple}
        value={[...value]}
        onValueChange={(values: string[]) => {
          const pressed = chips.flatMap((chip) => (values.includes(chip.value) ? [chip.value] : []));
          // One of one stays picked: pressing it again changes nothing.
          if (!multiple && pressed.length === 0) return;
          onChange(pressed);
        }}
        className="flex flex-wrap items-center gap-2"
      >
        {chips.map((chip) => (
          <TogglePrimitive
            key={chip.value}
            value={chip.value}
            className={cn(toggleVariants({ variant: "ringedChip" }), "pr-3 pl-2.5")}
          >
            {chip.swatch}
            {chip.label}
            {chip.detail != null && <span className="text-body-sm font-medium text-muted-foreground">{chip.detail}</span>}
          </TogglePrimitive>
        ))}
      </ToggleGroupPrimitive>
    </div>
  );
}

export { SwatchChips };
export type { SwatchChip, SwatchChipsProps };
