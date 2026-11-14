import { Meter as MeterPrimitive } from "@base-ui/react/meter";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/brand/cn";
import { meterIndicatorVariants, meterTrackVariants } from "./variants";

const clampPct = (value: number) => Math.min(100, Math.max(0, value));

type MeterProps = Omit<MeterPrimitive.Root.Props, "value" | "min" | "max"> &
  VariantProps<typeof meterTrackVariants> &
  VariantProps<typeof meterIndicatorVariants> & {
    value: number | null;
    marker?: number | null;
  };

function Meter({ value, marker, size = "default", tone = "primary", className, ...props }: MeterProps) {
  return (
    <MeterPrimitive.Root
      data-slot="meter"
      value={clampPct(value ?? 0)}
      className={cn("relative w-full", className)}
      {...props}
    >
      <MeterPrimitive.Track className={meterTrackVariants({ size })}>
        <MeterPrimitive.Indicator className={meterIndicatorVariants({ tone })} />
      </MeterPrimitive.Track>
      {marker != null && (
        <span
          data-slot="meter-marker"
          aria-hidden
          className="pointer-events-none absolute -inset-y-0.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
          style={{ left: `${clampPct(marker)}%` }}
        />
      )}
    </MeterPrimitive.Root>
  );
}

export { Meter };
