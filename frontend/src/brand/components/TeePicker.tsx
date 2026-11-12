import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cn } from "@/brand/cn";
import { formatCount } from "@/domain/format";
import { TeeSwatch } from "./TeeSwatch";
import { ToggleGroup, ToggleGroupItem } from "./ToggleGroup";

interface TeeOption {
  /** The tee's name as the course stores it ("Blue", "Back Gold"). */
  name: string;
  /** Its total yardage, when every hole has one. The chips show it. */
  yards: number | null;
}

interface TeePickerProps {
  tees: readonly TeeOption[];
  /** The tee picked, by name; none is pressed when it matches no tee. */
  value: string;
  onChange: (name: string) => void;
  /** What the row picks, named for screen readers and shown before the chips. */
  label?: string;
  /**
   * `chips` (the default) picks the tee a round was played from, each chip with its yardage.
   * `segmented` picks which tee a course's scorecard reads: a track of the tees' names, full
   * width on a phone.
   */
  variant?: "chips" | "segmented";
  className?: string;
}

/**
 * Picks a tee. As chips (the default), the tee a round was played from: a row of pill chips, each the tee's swatch, its name and
 * its yardage, the picked one ringed. Built on the same toggle group as `ToggleGroup`, so arrow keys
 * move between the chips; only the look differs, a chip a tee rather than a segmented track.
 */
function TeePicker({ tees, value, onChange, label = "Tee", variant = "chips", className }: TeePickerProps) {
  const picked = tees.find((tee) => tee.name.toLowerCase() === value.toLowerCase())?.name;

  if (variant === "segmented") {
    return (
      <ToggleGroup
        data-slot="tee-picker"
        aria-label={label}
        value={picked ? [picked] : []}
        onValueChange={(values: string[]) => {
          // Pressing the picked tee again keeps it: the card always reads one.
          if (values[0]) onChange(values[0]);
        }}
        className={cn("w-full md:w-fit", className)}
      >
        {tees.map((tee) => (
          <ToggleGroupItem
            key={tee.name}
            value={tee.name}
            className="min-w-0 flex-1 basis-0 gap-1.5 md:flex-none md:basis-auto"
          >
            <TeeSwatch color={tee.name} className="size-2.5 shrink-0 rounded-full ring-1 ring-border-strong ring-inset" />
            <span className="truncate capitalize">{tee.name}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    );
  }

  return (
    <div data-slot="tee-picker" className={cn("flex flex-wrap items-center gap-2", className)}>
      <span aria-hidden className="mr-0.5 text-body font-semibold text-foreground-secondary">
        {label}
      </span>
      <ToggleGroupPrimitive
        aria-label={label}
        value={picked ? [picked] : []}
        onValueChange={(values: string[]) => {
          // Pressing the picked chip again keeps it: a round is always played from a tee.
          if (values[0]) onChange(values[0]);
        }}
        className="flex flex-wrap items-center gap-2"
      >
        {tees.map((tee) => (
          <TogglePrimitive
            key={tee.name}
            value={tee.name}
            className="flex h-9 items-center gap-2 rounded-full bg-card pr-3 pl-2.5 text-body font-medium text-foreground ring-1 ring-input transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-pressed:font-bold data-pressed:ring-2 data-pressed:ring-foreground data-pressed:hover:bg-card"
          >
            <TeeSwatch color={tee.name} className="size-3.5 rounded-full ring-1 ring-border-strong ring-inset" />
            <span className="capitalize">{tee.name}</span>
            {tee.yards != null && (
              <span className="text-body-sm font-medium text-muted-foreground">{formatCount(tee.yards)}</span>
            )}
          </TogglePrimitive>
        ))}
      </ToggleGroupPrimitive>
    </div>
  );
}

export { TeePicker };
export type { TeeOption, TeePickerProps };
