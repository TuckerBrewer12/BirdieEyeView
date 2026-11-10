import { cn } from "@/brand/cn";
import { formatCount } from "@/domain/format";
import { TeeSwatch } from "./TeeSwatch";

interface TeeOption {
  /** The tee's name as the course stores it ("Blue", "Back Gold"). */
  name: string;
  /** Its total yardage, when every hole has one. */
  yards: number | null;
}

interface TeePickerProps {
  tees: readonly TeeOption[];
  /** The tee picked, by name; none is picked when it matches no tee. */
  value: string;
  onChange: (name: string) => void;
  /** What the row picks, named for screen readers and shown before the chips. */
  label?: string;
  className?: string;
}

/**
 * Picks the tee a round was played from: a row of pill chips, each the tee's swatch, its name and
 * its yardage, the picked one ringed. A radio group, so arrow keys aren't needed to read it: each
 * chip is a button that says whether it is checked.
 */
function TeePicker({ tees, value, onChange, label = "Tee", className }: TeePickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-slot="tee-picker"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      <span aria-hidden className="mr-0.5 text-body font-semibold text-foreground-secondary">
        {label}
      </span>
      {tees.map((tee) => {
        const checked = tee.name.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={tee.name}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(tee.name)}
            className={cn(
              "flex h-9 items-center gap-2 rounded-full bg-card pr-3 pl-2.5 text-body text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              checked ? "font-bold ring-2 ring-foreground" : "font-medium ring-1 ring-input hover:bg-muted",
            )}
          >
            <TeeSwatch color={tee.name} className="size-3.5 rounded-full ring-1 ring-border-strong ring-inset" />
            <span className="capitalize">{tee.name}</span>
            {tee.yards != null && (
              <span className="text-body-sm font-medium text-muted-foreground">{formatCount(tee.yards)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { TeePicker };
export type { TeeOption, TeePickerProps };
