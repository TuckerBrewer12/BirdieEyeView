import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
import { cn } from "@/brand/cn";
import { Button } from "./Button";
import { buttonVariants } from "./variants";

interface SortOption<T extends string> {
  value: T;
  label: string;
}

interface SortControlProps<T extends string> {
  /** The current choice, as it reads in the trigger. */
  label: string;
  /** A muted word before the label ("Sort"), for a control that says what it picks. */
  caption?: string;
  value: T;
  options: readonly SortOption<T>[];
  onChange: (value: T) => void;
  /** Leave off `onToggleDirection` and the control only picks: no arrow beside it. */
  ascending?: boolean;
  onToggleDirection?: () => void;
  directionDisabled?: boolean;
  /** While a pick is saving: the menu does not open. */
  disabled?: boolean;
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
  caption,
  value,
  options,
  onChange,
  ascending = true,
  onToggleDirection,
  directionDisabled = false,
  disabled = false,
  "aria-label": ariaLabel = "Sort by",
  className,
}: SortControlProps<T>) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const variant = onToggleDirection ? "ghost" : "outline";

  return (
    <div data-slot="sort-control" className={cn("inline-flex items-center gap-1", className)}>
      <Select.Root
        value={value}
        onValueChange={(next) => {
          if (next != null) onChange(next);
        }}
        items={options}
        modal={false}
      >
        <Select.Trigger
          aria-label={ariaLabel}
          className={buttonVariants({ variant: "ghost", className: "text-body font-semibold" })}
        >
          {caption && <span className="font-medium text-muted-foreground">{caption}</span>}
          {label}
          <ChevronDown aria-hidden className="size-3" />
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner
            side="bottom"
            align="end"
            alignItemWithTrigger={false}
            sideOffset={4}
            className="z-50"
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
          disabled={disabled}
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
          size="icon"
          aria-label={ascending ? "Sort descending" : "Sort ascending"}
          disabled={directionDisabled}
          onClick={onToggleDirection}
        >
          {directionDisabled || ascending ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )}
        </Button>
      )}
    </div>
  );
}

export { SortControl };
export type { SortControlProps, SortOption };
