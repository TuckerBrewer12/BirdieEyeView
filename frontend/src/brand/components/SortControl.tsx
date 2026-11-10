import { useState, type ReactNode } from "react";
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
  /** While a pick is saving: the menu does not open. */
  disabled?: boolean;
  /** What the menu picks: the trigger's name for screen readers and the phone sheet's title. */
  "aria-label"?: string;
  /** A quiet word before the pick on the desktop trigger: "Sort" in "Sort Newest". */
  prefix?: string;
  /** The phone trigger's label, where the desktop one is too long for the row: "Course" for "All courses". */
  phoneLabel?: string;
  /** Makes the phone trigger this icon alone, named "Sort by: Newest", for a title row with no room for words. */
  phoneIcon?: ReactNode;
  /** A picker that sits in a row of text, unboxed like a sort, though it has no direction. */
  quiet?: boolean;
  /** `default` is 40 tall, beside a page's search field; `sm` is 32, in a card or a list's header. */
  size?: "sm" | "default";
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
  disabled = false,
  "aria-label": ariaLabel = "Sort by",
  prefix,
  phoneLabel,
  phoneIcon,
  quiet = false,
  size = "sm",
  className,
}: SortControlProps<T>) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const variant = onToggleDirection || quiet ? "ghost" : "outline";

  return (
    <div data-slot="sort-control" className={cn("inline-flex items-center gap-0.5", className)}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label={ariaLabel}
          variant={variant}
          size={size}
          disabled={disabled}
          className="hidden md:inline-flex"
        >
          {prefix && <span className="font-medium text-muted-foreground">{prefix}</span>}
          {label}
        </DropdownMenuTrigger>
        <DropdownMenuContent data-slot="sort-menu" align="end" sideOffset={4}>
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(next: T) => onChange(next)}
          >
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value} closeOnClick>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        {phoneIcon != null ? (
          <SheetTrigger
            aria-label={`${ariaLabel}: ${label}`}
            disabled={disabled}
            render={<Button variant="ghost" size="icon" className="md:hidden" />}
          >
            {phoneIcon}
          </SheetTrigger>
        ) : (
          <SheetTrigger
            aria-label={ariaLabel}
            disabled={disabled}
            render={<Button variant={variant} size={size} className="md:hidden" />}
          >
            {phoneLabel ?? label}
            <ChevronDown aria-hidden data-icon="inline-end" className="size-3" />
          </SheetTrigger>
        )}
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
