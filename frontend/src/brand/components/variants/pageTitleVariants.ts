import { cva } from "class-variance-authority";

const pageTitleVariants = cva(
  "m-0 pt-1 text-foreground",
  {
    variants: {
      size: {
        default: "text-title",
        compact: "text-xl font-bold tracking-title",
        lg: "text-3xl font-extrabold tracking-title",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export { pageTitleVariants };
