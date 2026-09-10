import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { Select } from "@base-ui/react/select";
import { cn } from "@/brand/cn";

interface SortOption<T extends string> {
  value: T;
  label: string;
}

interface SortControlProps<T extends string> {
  label: string;
  value: T;
  options: SortOption<T>[];
  onChange: (value: T) => void;
  ascending: boolean;
  onToggleDirection: () => void;
  directionDisabled?: boolean;
  className?: string;
}

function SortControl<T extends string>({
  label,
  value,
  options,
  onChange,
  ascending,
  onToggleDirection,
  directionDisabled = false,
  className,
}: SortControlProps<T>) {
  return (
    <div data-slot="sort-control" className={cn("inline-flex items-center gap-0.5", className)}>
      <Select.Root
        value={value}
        onValueChange={(next) => {
          if (next != null) onChange(next);
        }}
        items={options}
        modal={false}
      >
        <Select.Trigger
          aria-label="Sort by"
          className="rounded-sm px-0.5 text-[11px] font-semibold text-primary outline-none select-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {label}
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
      <button
        type="button"
        aria-label={ascending ? "Sort descending" : "Sort ascending"}
        disabled={directionDisabled}
        onClick={onToggleDirection}
        className="inline-flex size-5 items-center justify-center rounded-sm text-primary outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-40"
      >
        {directionDisabled || ascending ? (
          <ArrowUp className="size-3.5" />
        ) : (
          <ArrowDown className="size-3.5" />
        )}
      </button>
    </div>
  );
}

export { SortControl };
export type { SortControlProps, SortOption };
