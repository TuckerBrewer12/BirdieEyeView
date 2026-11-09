import { cva } from "class-variance-authority";

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
      /** A row of small figures, like the four under a hero number. */
      sm: "text-base font-semibold tracking-stat",
      md: "text-2xl font-semibold tracking-stat",
      /** A card's headline figure, a KPI tile's. */
      lg: "text-stat",
      /** The one number a screen leads with. */
      xl: "text-6xl font-bold tracking-hero",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

/** A delta's ink is the server's verdict on the move; `pill` sets it on a wash of the same tone. */
const statDeltaVariants = cva("inline-flex items-center gap-1 text-body-sm font-bold whitespace-nowrap", {
  variants: {
    tone: {
      // A good move reads in the brand's green, as every figure card on the soft surface has it.
      good: "text-primary",
      bad: "text-score-bogey",
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

export { statVariants, statValueVariants, statDeltaVariants };
