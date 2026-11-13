import { cva } from "class-variance-authority";

const pageTitleVariants = cva(
  "m-0 pt-1 text-foreground",
  {
    variants: {
      size: {
        default: "text-title",
        compact: "text-xl font-bold tracking-title",
        lg: "text-3xl font-extrabold tracking-title",
        /** A heading under a page's own bar: a round's course (26 on a phone), the dashboard's greeting. */
        heading: "pt-0 text-title font-semibold md:text-heading",
        /** A name set as a figure: the phone dashboard's greeting. */
        figure: "truncate pt-0 text-figure-sm leading-tight tracking-title",
        /** The landing page's headline, growing with the screen. */
        display: "pt-0 text-display-sm text-balance md:text-display lg:text-display-lg",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export { pageTitleVariants };
