import { cva } from "class-variance-authority";

const inputVariants = cva(
  "w-full min-w-0 border border-input bg-transparent transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/half disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/half disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/wash dark:bg-input/recessed dark:disabled:bg-input/strong dark:aria-invalid:ring-destructive/recessed",
  {
    variants: {
      size: {
        default: "h-8 rounded-lg px-2.5 py-1 text-base md:text-sm",
        /* Marketing-sized. Auth fields sit on a wide split layout and the
           in-app chrome size reads as a toolbar control there. */
        cta: "h-12 rounded-xl px-4 text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export { inputVariants };
