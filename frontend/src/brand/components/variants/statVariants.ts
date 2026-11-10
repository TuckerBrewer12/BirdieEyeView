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
      /** A figure card's number on the soft surface, as the dashboard's row has it. */
      card: "text-figure",
      /** The same on a phone. */
      "card-sm": "text-figure-sm",
      /** The figures beside a round's score, as round detail's summary sets them: smaller on a phone. */
      summary: "text-lg font-semibold tracking-stat md:text-figure-sm",
      /** A sheet's lead figure: the handicap index in its breakdown. */
      hero: "text-hero font-semibold",
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

/** What a figure measures: set in the secondary ink, or `quiet` in the muted one, as a card's caption. */
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
