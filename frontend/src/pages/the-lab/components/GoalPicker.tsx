import { ToggleGroup, ToggleGroupItem } from "@/brand";
import { goalTargetLabel } from "@/domain";

interface GoalPickerProps {
  /** The goals on offer, as stored, in the order shown. */
  options: readonly number[];
  /** The goal as stored (79 to break 80), or null with none set. */
  value: number | null;
  onChange: (target: number) => void;
  /** While a pick is saving. */
  disabled?: boolean;
  /** 0 joins the goals into one control; a gap sets them apart, so a row that wraps on a phone still reads. */
  spacing?: number;
  className?: string;
}

/** The scoring goals a golfer can set, one pressed. */
export function GoalPicker({ options, value, onChange, disabled, spacing = 0, className }: GoalPickerProps) {
  return (
    <ToggleGroup
      data-slot="goal-picker"
      aria-label="Scoring goal"
      variant="outline"
      size="sm"
      spacing={spacing}
      disabled={disabled}
      value={value != null ? [String(value)] : []}
      onValueChange={(values) => {
        // Pressing the chosen goal again would clear it; the goal only ever changes to another.
        const next = options.find((option) => String(option) === values[0]);
        if (next != null) onChange(next);
      }}
      className={className}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option} value={String(option)}>
          {goalTargetLabel(option)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
