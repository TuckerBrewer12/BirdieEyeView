import { cva } from "class-variance-authority";

const pageTitleVariants = cva(
  "m-0 pt-1 font-bold tracking-[-0.5px] text-foreground",
  {
    variants: {
      size: {
        default: "text-[26px]",
        compact: "text-xl",
        lg: "text-3xl font-extrabold tracking-tight",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export { pageTitleVariants };
