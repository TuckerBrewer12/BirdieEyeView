import { cva } from "class-variance-authority";

const inputVariants = cva(
  "w-full min-w-0 border border-input bg-transparent text-base text-foreground md:text-field transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-body file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/50 dark:bg-input/30 dark:focus-visible:ring-ring/30 dark:disabled:bg-input/80 dark:aria-invalid:ring-destructive/60",
  {
    variants: {
      size: {
        /* A field in a form, under its label. */
        default: "h-11 rounded-card px-3.5",
        /* A field inside a row of its own (settings, a table cell): the row
           carries the label and the height. */
        inline: "h-9 rounded-lg px-2.5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export { inputVariants };
