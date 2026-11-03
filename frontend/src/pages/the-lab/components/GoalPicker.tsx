import { ToggleGroup, ToggleGroupItem } from "@/brand";
import { GOAL_OPTIONS } from "@/domain";

interface GoalPickerProps {
  value: number | null;
  onChange: (target: number) => void;
  disabled?: boolean;
  spacing?: number;
  className?: string;
}

export function GoalPicker({ value, onChange, disabled, spacing = 0, className }: GoalPickerProps) {
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
