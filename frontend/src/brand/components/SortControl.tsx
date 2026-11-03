import { ArrowDown, ArrowUp, Check, ChevronDown } from "lucide-react";
import { Select } from "@base-ui/react/select";
import { cn } from "@/brand/cn";
import { tokens } from "@/brand/theme";

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
  /** What the menu picks, for screen readers. */
  "aria-label"?: string;
  className?: string;
}

function SortControl<T extends string>({
  label,
  caption,
  value,
  options,
  onChange,
  ascending = true,
  onToggleDirection,
  directionDisabled = false,
  "aria-label": ariaLabel = "Sort by",
  className,
}: SortControlProps<T>) {
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
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-body font-semibold text-foreground outline-none select-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {caption && <span className="font-medium text-muted-foreground">{caption}</span>}
          {label}
          <ChevronDown aria-hidden strokeWidth={tokens.stroke.icon} className="size-3" />
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner
            side="bottom"
            align="end"
            alignItemWithTrigger={false}
            sideOffset={4}
            className="z-50"
          >
            <Select.Popup
              data-slot="sort-menu"
              className="min-w-28 origin-(--transform-origin) overflow-hidden rounded-lg bg-card p-1 text-card-foreground shadow-md ring-1 ring-foreground/10 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
            >
              <Select.List className="!block w-full">
                {options.map((option) => (
                  <Select.Item
                    key={option.value}
                    value={option.value}
                    className="relative flex w-full cursor-default items-center rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none data-highlighted:bg-muted data-highlighted:text-foreground data-selected:bg-primary data-selected:text-primary-foreground data-selected:data-highlighted:bg-primary data-selected:data-highlighted:text-primary-foreground"
                  >
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <Select.ItemIndicator className="absolute right-2 inline-flex">
                      <Check className="size-3.5" />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      {onToggleDirection && (
        <button
          type="button"
          aria-label={ascending ? "Sort descending" : "Sort ascending"}
          disabled={directionDisabled}
          onClick={onToggleDirection}
          className="inline-flex size-8 items-center justify-center rounded-lg text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {directionDisabled || ascending ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

export { SortControl };
export type { SortControlProps, SortOption };
