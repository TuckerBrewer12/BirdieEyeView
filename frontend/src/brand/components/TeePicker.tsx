import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cn } from "@/brand/cn";
import { formatCount } from "@/domain/format";
import { TeeSwatch } from "./TeeSwatch";

interface TeeOption {
  /** The tee's name as the course stores it ("Blue", "Back Gold"). */
  name: string;
  /** Its total yardage, when every hole has one. */
  yards: number | null;
  /** More about it after the yardage, worded by the caller: "72.4 / 130 · CH 12". */
  detail?: string | null;
}

interface TeePickerProps {
  tees: readonly TeeOption[];
  /** The tee picked, by name; none is pressed when it matches no tee. */
  value: string;
  onChange: (name: string) => void;
  /** Lets the picked chip be pressed again to pick none. Left out, a tee is always picked. */
  onClear?: () => void;
  /** What the row picks, named for screen readers and shown before the chips. */
  label?: string;
  className?: string;
}

/**
 * Picks the tee a round was played from: a row of pill chips, each the tee's swatch, its name and
 * its yardage, the picked one ringed. Built on the same toggle group as `ToggleGroup`, so arrow keys
 * move between the chips; only the look differs, a chip a tee rather than a segmented track.
 */
function TeePicker({ tees, value, onChange, onClear, label = "Tee", className }: TeePickerProps) {
  const picked = tees.find((tee) => tee.name.toLowerCase() === value.toLowerCase())?.name;

  return (
    <div data-slot="tee-picker" className={cn("flex flex-wrap items-center gap-2", className)}>
      <span aria-hidden className="mr-0.5 text-body font-semibold text-foreground-secondary">
        {label}
      </span>
      <ToggleGroupPrimitive
        aria-label={label}
        value={picked ? [picked] : []}
        onValueChange={(values: string[]) => {
          // Pressing the picked chip again keeps it, unless the caller lets it clear.
          if (values[0]) onChange(values[0]);
          else onClear?.();
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
            {tee.detail && <span className="text-body-sm font-medium text-muted-foreground">{tee.detail}</span>}
          </TogglePrimitive>
        ))}
      </ToggleGroupPrimitive>
    </div>
  );
}

export { TeePicker };
export type { TeeOption, TeePickerProps };
