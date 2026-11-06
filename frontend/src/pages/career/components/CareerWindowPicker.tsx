import { ToggleGroup, ToggleGroupItem } from "@/brand";
import { CAREER_WINDOWS, type CareerWindow } from "../model";
import { windowLabel } from "../present";

interface CareerWindowPickerProps {
  value: CareerWindow;
  onChange: (timeWindow: CareerWindow) => void;
  windowDays: number;
  className?: string;
}

export function CareerWindowPicker({ value, onChange, windowDays, className }: CareerWindowPickerProps) {
  return (
    <ToggleGroup
      data-slot="career-window-picker"
      aria-label="Records window"
      variant="outline"
      size="sm"
      spacing={0}
      value={[value]}
      onValueChange={(values) => {
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
