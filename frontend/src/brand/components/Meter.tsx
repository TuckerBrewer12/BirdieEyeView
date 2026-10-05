import { Meter as MeterPrimitive } from "@base-ui/react/meter";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/brand/cn";
import { meterIndicatorVariants, meterTrackVariants } from "./variants";

const clampPct = (value: number) => Math.min(100, Math.max(0, value));

type MeterProps = Omit<MeterPrimitive.Root.Props, "value" | "min" | "max"> &
  VariantProps<typeof meterTrackVariants> &
  VariantProps<typeof meterIndicatorVariants> & {
    /** Percent filled, 0–100. Null draws an empty track. */
    value: number | null;
    /** A tick across the track at a reference point, in percent: a tour average, a goal. */
    marker?: number | null;
  };

/** How far along a figure is, as a filled bar. Screen readers get it as a meter. */
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
        // Outside the track, which clips, so the tick can stand taller than the bar.
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
