import { cva } from "class-variance-authority";

const pageTitleVariants = cva(
  "m-0 pt-1 text-foreground",
  {
    variants: {
      size: {
        default: "text-title",
        compact: "text-2xl font-bold tracking-title",
        lg: "text-3xl font-extrabold tracking-title",
        heading: "pt-0 text-title font-semibold md:text-heading",
        figure: "truncate pt-0 text-figure-sm leading-tight tracking-title",
        display: "pt-0 text-display-sm text-balance md:text-display lg:text-display-lg",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export { pageTitleVariants };
