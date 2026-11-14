import type { ReactNode } from "react";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cn } from "@/brand/cn";
import { toggleVariants } from "./variants";

interface SwatchChip<T extends string> {
  value: T;
  label: string;
  swatch: ReactNode;
  detail?: string | null;
}

interface SwatchChipsProps<T extends string> {
  chips: readonly SwatchChip<T>[];
  value: readonly T[];
  onChange: (value: T[]) => void;
  multiple?: boolean;
  label: string;
  hideLabel?: boolean;
  className?: string;
}

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
