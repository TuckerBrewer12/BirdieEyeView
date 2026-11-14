import { formatCourseName } from "@/domain/course";
import { formatCount } from "@/domain/format";
import { SwatchChips } from "./SwatchChips";
import { TeeSwatch } from "./TeeSwatch";

interface TeeOption {
  name: string;
  yards: number | null;
}

interface TeePickerProps {
  tees: readonly TeeOption[];
  value: string;
  onChange: (name: string) => void;
  label?: string;
  hideLabel?: boolean;
  className?: string;
}

function TeePicker({ tees, value, onChange, label = "Tee", hideLabel, className }: TeePickerProps) {
  const picked = tees.find((tee) => tee.name.toLowerCase() === value.toLowerCase())?.name;
  return (
    <SwatchChips
      label={label}
      hideLabel={hideLabel}
      className={className}
      value={picked ? [picked] : []}
      onChange={(names) => {
        if (names[0]) onChange(names[0]);
      }}
      chips={tees.map((tee) => ({
        value: tee.name,
        label: formatCourseName(tee.name),
        swatch: <TeeSwatch color={tee.name} className="size-3.5 rounded-full ring-1 ring-border-strong ring-inset" />,
        detail: tee.yards != null ? formatCount(tee.yards) : null,
      }))}
    />
  );
}

export { TeePicker };
export type { TeeOption, TeePickerProps };
