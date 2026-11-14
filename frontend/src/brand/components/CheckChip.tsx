import * as React from "react";
import { cn } from "@/brand/cn";
import { Checkbox } from "./Input";

interface CheckChipProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Something that's there or not, as a box you tick inside a bordered chip: "Putts" on the card. A
 * row of them sits in a group named for what they answer (`role="group"` with an `aria-label`).
 */
function CheckChip({ checked, onCheckedChange, children, className }: CheckChipProps) {
  return (
    <label
      data-slot="check-chip"
      data-checked={checked || undefined}
      className={cn(
        "inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-input bg-card px-3 text-body text-foreground transition-colors hover:bg-muted",
        className,
      )}
    >
      <Checkbox checked={checked} onChange={(event) => onCheckedChange(event.target.checked)} />
      {children}
    </label>
  );
}

export { CheckChip };
