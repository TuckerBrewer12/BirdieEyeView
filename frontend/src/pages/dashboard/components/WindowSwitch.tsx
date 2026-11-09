import { ToggleGroup, ToggleGroupItem } from "@/brand";
import type { DashboardWindowKey } from "../model";

interface WindowSwitchProps {
  value: DashboardWindowKey;
  onChange: (window: DashboardWindowKey) => void;
  size?: "default" | "sm";
  className?: string;
}

/** Last 5 / Last 20: which rounds the dashboard's figures and charts measure. */
export function WindowSwitch({ value, onChange, size = "default", className }: WindowSwitchProps) {
  return (
    <ToggleGroup
      aria-label="Range"
      size={size}
      className={className}
      value={[value]}
      onValueChange={(values) => {
        // Tapping the pressed option would empty the group; one window is always picked.
        if (values[0] === "last5" || values[0] === "last20") onChange(values[0]);
      }}
    >
      <ToggleGroupItem value="last5">Last 5</ToggleGroupItem>
      <ToggleGroupItem value="last20">Last 20</ToggleGroupItem>
    </ToggleGroup>
  );
}
