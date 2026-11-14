import { cva } from "class-variance-authority";
import { VERDICT_TEXT } from "@/brand/theme/score";

const statVariants = cva("flex flex-col gap-1", {
  variants: {
    align: {
      start: "items-start text-left",
      center: "items-center text-center",
      end: "items-end text-right",
    },
  },
  defaultVariants: {
    align: "start",
  },
});

const statValueVariants = cva("flex items-baseline gap-1 leading-none tabular-nums text-card-foreground", {
  variants: {
    size: {
      sm: "text-base font-semibold tracking-stat",
      md: "text-2xl font-semibold tracking-stat",
      lg: "text-stat",
      card: "text-figure",
      "card-sm": "text-figure-sm",
      summary: "text-lg font-semibold tracking-stat md:text-figure-sm",
      hero: "text-hero font-semibold",
      xl: "text-6xl font-bold tracking-hero",
    },
    tone: {
      good: VERDICT_TEXT.good,
      bad: VERDICT_TEXT.bad,
      neutral: "",
    },
  },
  defaultVariants: {
    size: "md",
    tone: "neutral",
  },
});

const statDeltaVariants = cva("inline-flex items-center gap-1 text-body-sm font-bold whitespace-nowrap", {
  variants: {
    tone: {
      good: VERDICT_TEXT.good,
      bad: VERDICT_TEXT.bad,
      neutral: "text-muted-foreground",
    },
    pill: {
      true: "rounded-full px-2 py-0.5",
      false: "",
    },
  },
  compoundVariants: [
    { tone: "good", pill: true, className: "bg-score-birdie-muted" },
    { tone: "bad", pill: true, className: "bg-score-bogey-muted" },
    { tone: "neutral", pill: true, className: "bg-muted" },
  ],
  defaultVariants: {
    tone: "neutral",
    pill: false,
  },
});

const statLabelVariants = cva("text-body", {
  variants: {
    tone: {
      default: "font-medium text-foreground-secondary",
      quiet: "text-muted-foreground",
    },
  },
  defaultVariants: { tone: "default" },
});

export { statVariants, statValueVariants, statDeltaVariants, statLabelVariants };
