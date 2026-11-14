import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@/brand/cn";

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  "aria-label": string;
  valueLabel?: string;
  className?: string;
}

function Slider({ value, onValueChange, min, max, valueLabel, className, "aria-label": ariaLabel }: SliderProps) {
  return (
    <div data-slot="slider" className={cn("flex items-center gap-4", className)}>
      <SliderPrimitive.Root
        value={value}
        min={min}
        max={max}
        step={1}
        onValueChange={(next) => onValueChange(next)}
        className="min-w-0 flex-1"
      >
        <SliderPrimitive.Control className="flex h-6 w-full touch-none items-center select-none">
          <SliderPrimitive.Track className="h-1.5 w-full rounded-full bg-muted">
            <SliderPrimitive.Indicator className="rounded-full bg-primary" />
            <SliderPrimitive.Thumb
              aria-label={ariaLabel}
              className="size-5 rounded-full border-2 border-primary bg-card shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/half"
            />
          </SliderPrimitive.Track>
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
      {valueLabel && <span className="shrink-0 text-body font-semibold text-foreground-secondary tabular-nums">{valueLabel}</span>}
    </div>
  );
}

export { Slider };
export type { SliderProps };
