import { cva } from "class-variance-authority";
import { fieldRing } from "./fieldRing";

const inputVariants = cva(
  [
    "w-full min-w-0 border border-input bg-transparent text-base text-foreground md:text-field transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-body file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30 dark:disabled:bg-input/80",
    fieldRing,
  ],
  {
    variants: {
      size: {
        /* A field in a form, under its label. */
        default: "h-11 rounded-card px-3.5",
        /* A field inside a row of its own (settings, a table cell, beside a
           button): the row carries the label. 40px, a default Button's height,
           so a field and its button line up. */
        inline: "h-10 rounded-card px-3",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export { inputVariants };
