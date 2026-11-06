import { cva } from "class-variance-authority";

const teeSwatchVariants = cva("", {
  variants: {
    tee: {
      // Black and white sit on a card of their own shade in one colour mode, so they keep an edge.
      black: "bg-tee-black text-tee-black-on ring-1 ring-border",
      white: "bg-tee-white text-tee-white-on ring-1 ring-border",
      blue: "bg-tee-blue text-tee-blue-on",
      gold: "bg-tee-gold text-tee-gold-on",
      yellow: "bg-tee-yellow text-tee-yellow-on",
      red: "bg-tee-red text-tee-red-on",
      green: "bg-tee-green text-tee-green-on",
      silver: "bg-tee-silver text-tee-silver-on",
      orange: "bg-tee-orange text-tee-orange-on",
      purple: "bg-tee-purple text-tee-purple-on",
      brown: "bg-tee-brown text-tee-brown-on",
      none: "bg-muted text-muted-foreground",
    },
  },
  defaultVariants: {
    tee: "none",
  },
});

export { teeSwatchVariants };
