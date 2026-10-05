import { cva } from "class-variance-authority";

const meterTrackVariants = cva("w-full overflow-hidden rounded-full bg-muted", {
  variants: {
    size: {
      sm: "h-1.5",
      default: "h-2",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

const meterIndicatorVariants = cva("h-full rounded-full transition-all", {
  variants: {
    tone: {
      primary: "bg-primary",
      /** Reached: the bar reads as a birdie. */
      success: "bg-score-birdie-base",
      /** Still on the way: fades from the brand green toward the chart axis. */
      progress: "bg-linear-to-r from-primary to-(--chart-axis)",
    },
  },
  defaultVariants: {
    tone: "primary",
  },
});

export { meterTrackVariants, meterIndicatorVariants };
