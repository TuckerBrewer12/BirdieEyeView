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
  /** What the menu picks: the trigger's name for screen readers and the phone sheet's title. */
  "aria-label": string;
  /** The pick as the trigger shows it. */
  label: string;
  value: T;
  options: readonly PickerOption<T>[];
  onChange: (value: T) => void;
  /** While a pick is saving: the menu does not open. */
  disabled?: boolean;
  /** A quiet word before the pick on the wide trigger: "Sort" in "Sort Newest". */
  prefix?: string;
  /** The phone trigger's words, where the pick is too long for the row: "Course" for "All courses". */
  compactLabel?: string;
  /** Makes the phone trigger this icon alone, named "Sort by: Newest", for a title row with no room for words. */
  compactIcon?: ReactNode;
  /** `outline` boxes the trigger, as a filter in a row of controls; `ghost` sets it in the text, as a sort. */
  variant?: "outline" | "ghost";
  /** `default` is 40 tall, beside a page's search field; `sm` is 32, in a card or a list's header. */
  size?: "sm" | "default";
  /** Stretch to share the row with its neighbours, the pick at the start and the chevron at the end: a phone's row of menus. */
  fill?: boolean;
  className?: string;
}

/**
 * Picks one of a few options: a sort order, a course, a goal. From `md` up the options drop down
 * under the trigger; on a phone they rise in a bottom sheet with 52px rows. One trigger either way,
 * so a page places the picker once.
 */
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
  // Which surface the options open in, not how the trigger looks.
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
