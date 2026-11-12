import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cn } from "@/brand/cn";
import { formatCount } from "@/domain/format";
import { TeeSwatch } from "./TeeSwatch";
import { toggleVariants } from "./variants";

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
  className?: string;
}

/**
 * Picks a tee: the one a round was played from, or the one a course's scorecard reads. A row of pill
 * chips with a gap between them, each the tee's swatch, its name and its yardage, the picked one ringed. Built on the same toggle group and chip as `ToggleGroup look="chips"`, ringed rather than filled so the swatch reads, so arrow keys
 * move between the chips; each chip also carries the tee's swatch and yardage.
 */
function TeePicker({ tees, value, onChange, label = "Tee", className }: TeePickerProps) {
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
          // Pressing the picked chip again keeps it: a round is played from a tee, a card reads one.
          if (values[0]) onChange(values[0]);
        }}
        className="flex flex-wrap items-center gap-2"
      >
        {tees.map((tee) => (
          <TogglePrimitive
            key={tee.name}
            value={tee.name}
            className={cn(toggleVariants({ variant: "ringedChip" }), "pr-3 pl-2.5")}
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
