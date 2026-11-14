import { cva } from "class-variance-authority";
import { fieldRing } from "./fieldRing";

const inputVariants = cva(
  [
    "w-full min-w-0 border border-input bg-transparent text-base text-foreground md:text-body-lg transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-body file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/half disabled:opacity-50 dark:bg-input/recessed dark:disabled:bg-input/strong",
    fieldRing,
  ],
  {
    variants: {
      size: {
        default: "h-11 rounded-card px-3.5",
        inline: "h-10 rounded-card px-3",
        value: "h-9 rounded-lg border-transparent px-2 text-right tabular-nums hover:border-input dark:bg-transparent",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export { inputVariants };
