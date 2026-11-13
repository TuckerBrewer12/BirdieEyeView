import { formatCourseName } from "@/domain/course";
import { formatCount } from "@/domain/format";
import { SwatchChips } from "./SwatchChips";
import { TeeSwatch } from "./TeeSwatch";

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
 * Picks a tee: the one a round was played from, or the one a course's scorecard reads. One of the
 * `SwatchChips`, each the tee's swatch, its name and its yardage. Pressing the picked tee keeps it:
 * a round is played from a tee, a card reads one.
 */
function TeePicker({ tees, value, onChange, label = "Tee", className }: TeePickerProps) {
  const picked = tees.find((tee) => tee.name.toLowerCase() === value.toLowerCase())?.name;
  return (
    <SwatchChips
      label={label}
      className={className}
      value={picked ? [picked] : []}
      onChange={(names) => {
        if (names[0]) onChange(names[0]);
      }}
      chips={tees.map((tee) => ({
        value: tee.name,
        // A tee is named in title case, as a course is: "back gold" reads "Back Gold".
        label: formatCourseName(tee.name),
        swatch: <TeeSwatch color={tee.name} className="size-3.5 rounded-full ring-1 ring-border-strong ring-inset" />,
        detail: tee.yards != null ? formatCount(tee.yards) : null,
      }))}
    />
  );
}

export { TeePicker };
export type { TeeOption, TeePickerProps };
