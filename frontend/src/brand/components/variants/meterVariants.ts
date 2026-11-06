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
      success: "bg-score-birdie-base",
      progress: "bg-linear-to-r from-primary to-(--chart-axis)",
    },
  },
  defaultVariants: {
    tone: "primary",
  },
});

export { meterTrackVariants, meterIndicatorVariants };
