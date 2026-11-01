import { ToggleGroup, ToggleGroupItem } from "@/brand";
import { GOAL_OPTIONS } from "@/domain";

interface GoalPickerProps {
  /** The goal as stored (79 to break 80), or null with none set. */
  value: number | null;
  onChange: (target: number) => void;
  /** While a pick is saving. */
  disabled?: boolean;
  className?: string;
}

/** The scoring goals a golfer can set, one pressed. */
export function GoalPicker({ value, onChange, disabled, className }: GoalPickerProps) {
  return (
    <ToggleGroup
      data-slot="goal-picker"
      aria-label="Scoring goal"
      variant="outline"
      size="sm"
      spacing={0}
      disabled={disabled}
      value={value != null ? [String(value)] : []}
      onValueChange={(values) => {
        // Pressing the chosen goal again would clear it; the goal only ever changes to another.
        const next = GOAL_OPTIONS.find((option) => String(option.value) === values[0]);
        if (next) onChange(next.value);
      }}
      className={className}
    >
      {GOAL_OPTIONS.map((option) => (
        <ToggleGroupItem key={option.value} value={String(option.value)}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
