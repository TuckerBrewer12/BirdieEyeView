import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useFromBreakpoint } from "@/brand/useFromBreakpoint";
import { cn } from "@/brand/cn";
import { Button } from "./Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./DropdownMenu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetOption,
  SheetOptions,
  SheetTitle,
  SheetTrigger,
} from "./Sheet";

interface PickerOption<T extends string> {
  value: T;
  label: string;
}

interface PickerMenuProps<T extends string> {
  "aria-label": string;
  label: string;
  value: T;
  options: readonly PickerOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  prefix?: string;
  compactLabel?: string;
  compactIcon?: ReactNode;
  variant?: "outline" | "ghost";
  size?: "sm" | "default";
  fill?: boolean;
  className?: string;
}

function PickerMenu<T extends string>({
  "aria-label": ariaLabel,
  label,
  value,
  options,
  onChange,
  disabled = false,
  prefix,
  compactLabel,
  compactIcon,
  variant = "outline",
  size = "sm",
  fill = false,
  className,
}: PickerMenuProps<T>) {
  const wide = useFromBreakpoint("md");
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div data-slot="picker-menu" className={cn("inline-flex items-center", fill && "min-w-0 flex-1", className)}>
      {wide ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            aria-label={ariaLabel}
            variant={variant}
            size={size}
            disabled={disabled}
            className={cn(fill && "w-full justify-between")}
          >
            {prefix && <span className="font-medium text-muted-foreground">{prefix}</span>}
            {label}
          </DropdownMenuTrigger>
          <DropdownMenuContent data-slot="picker-options" align="end" sideOffset={4}>
            <DropdownMenuRadioGroup value={value} onValueChange={(next: T) => onChange(next)}>
              {options.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value} closeOnClick>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          {compactIcon != null ? (
            <SheetTrigger
              aria-label={`${ariaLabel}: ${label}`}
              disabled={disabled}
              render={<Button variant="ghost" size="icon" />}
            >
              {compactIcon}
            </SheetTrigger>
          ) : (
            <SheetTrigger aria-label={ariaLabel} disabled={disabled} render={<Button variant={variant} size={size} className={cn(fill && "w-full justify-between")} />}>
              {compactLabel ?? label}
              <ChevronDown aria-hidden data-icon="inline-end" className="size-3" />
            </SheetTrigger>
          )}
          <SheetContent side="bottom" data-slot="picker-options">
            <SheetHeader>
              <SheetTitle>{ariaLabel}</SheetTitle>
            </SheetHeader>
            <SheetOptions>
              {options.map((option) => (
                <SheetOption
                  key={option.value}
                  selected={option.value === value}
                  onClick={() => {
                    onChange(option.value);
                    setSheetOpen(false);
                  }}
                >
                  {option.label}
                </SheetOption>
              ))}
            </SheetOptions>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

export { PickerMenu };
export type { PickerMenuProps, PickerOption };
