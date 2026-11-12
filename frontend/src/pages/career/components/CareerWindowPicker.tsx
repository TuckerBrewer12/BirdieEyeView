import { ToggleGroup, ToggleGroupItem } from "@/brand";
import { CAREER_WINDOWS, type CareerWindow } from "../model";
import { windowLabel } from "../present";

interface CareerWindowPickerProps {
  value: CareerWindow;
  onChange: (timeWindow: CareerWindow) => void;
  /** How many days "the last year" spans, from the server. */
  windowDays: number;
  className?: string;
}

/** Every round, or the last year's: what the records, totals and milestones count. */
export function CareerWindowPicker({ value, onChange, windowDays, className }: CareerWindowPickerProps) {
  return (
    <ToggleGroup
      data-slot="career-window-picker"
      aria-label="Records window"
      size="sm"
      value={[value]}
      onValueChange={(values) => {
        // Tapping the picked window would empty the group; one window is always picked.
        const next = CAREER_WINDOWS.find((option) => option === values[0]);
        if (next) onChange(next);
      }}
      className={className}
    >
      {CAREER_WINDOWS.map((option) => (
        <ToggleGroupItem key={option} value={option}>
          {windowLabel(option, windowDays)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
