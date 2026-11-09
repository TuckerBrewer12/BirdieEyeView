import { SortControl } from "@/brand";
import { GOAL_OPTIONS } from "@/domain";

interface GoalPickerProps {
  /** The goal as stored (79 to break 80), or null with none set. */
  value: number | null;
  onChange: (target: number) => void;
  /** While a pick is saving. */
  disabled?: boolean;
  className?: string;
}

const OPTIONS = GOAL_OPTIONS.map((option) => ({ value: String(option.value), label: option.label }));

/**
 * The scoring goals a golfer can set, as a menu: seven goals are too many for a
 * segmented control. The trigger reads the goal that is set.
 */
export function GoalPicker({ value, onChange, disabled, className }: GoalPickerProps) {
  const current = GOAL_OPTIONS.find((option) => option.value === value);

  return (
    <div data-slot="goal-picker" className={className}>
      <SortControl
        aria-label="Scoring goal"
        label={current?.label ?? "Pick a goal"}
        value={current ? String(current.value) : ""}
        options={OPTIONS}
        onChange={(next) => {
          const goal = GOAL_OPTIONS.find((option) => String(option.value) === next);
          if (goal && !disabled) onChange(goal.value);
        }}
      />
    </div>
  );
}
