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

const statValueVariants = cva(
  "flex items-baseline gap-1 font-semibold leading-none tracking-stat tabular-nums text-card-foreground",
  {
    variants: {
      size: {
        sm: "text-base",
        md: "text-2xl",
        lg: "text-4xl",
        xl: "text-6xl font-bold tracking-hero",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export { statVariants, statValueVariants };
