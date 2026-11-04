import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
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

interface SortOption<T extends string> {
  value: T;
  label: string;
}

interface SortControlProps<T extends string> {
  label: string;
  value: T;
  options: readonly SortOption<T>[];
  onChange: (value: T) => void;
  /**
   * Leave off `onToggleDirection` and the control only picks, like a filter:
   * no arrow, and a bordered button instead of a quiet one.
   */
  ascending?: boolean;
  onToggleDirection?: () => void;
  directionDisabled?: boolean;
  /** What the menu picks: the trigger's name for screen readers and the phone sheet's title. */
  "aria-label"?: string;
  className?: string;
}

/**
 * Picks one of a few options. From `md` up the options drop down under the
 * button; on a phone they rise in a bottom sheet with 52px rows.
 */
function SortControl<T extends string>({
  label,
  value,
  options,
  onChange,
  ascending = true,
  onToggleDirection,
  directionDisabled = false,
  "aria-label": ariaLabel = "Sort by",
  className,
}: SortControlProps<T>) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const variant = onToggleDirection ? "ghost" : "outline";

  return (
    <div data-slot="sort-control" className={cn("inline-flex items-center gap-0.5", className)}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label={ariaLabel}
          variant={variant}
          size="sm"
          className="hidden md:inline-flex"
        >
          {label}
        </DropdownMenuTrigger>
        <DropdownMenuContent data-slot="sort-menu" align="end" sideOffset={4}>
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(next: T) => onChange(next)}
          >
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger
          aria-label={ariaLabel}
          render={<Button variant={variant} size="sm" className="md:hidden" />}
        >
          {label}
          <ChevronDown aria-hidden data-icon="inline-end" className="size-3" />
        </SheetTrigger>
        <SheetContent side="bottom" data-slot="sort-sheet">
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

      {onToggleDirection && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={ascending ? "Sort descending" : "Sort ascending"}
          disabled={directionDisabled}
          onClick={onToggleDirection}
        >
          {directionDisabled || ascending ? <ArrowUp /> : <ArrowDown />}
        </Button>
      )}
    </div>
  );
}

export { SortControl };
export type { SortControlProps, SortOption };
