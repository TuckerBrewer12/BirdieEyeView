import { cva } from "class-variance-authority";

/** The recessed track a segmented control's options sit in. */
const segmentedTrackVariants = cva("flex items-center gap-0.5 bg-muted", {
  variants: {
    size: {
      default: "rounded-card p-chip",
      sm: "rounded-lg p-0.5",
    },
    fill: {
      true: "w-full",
      false: "w-fit",
    },
  },
  defaultVariants: {
    size: "default",
    fill: false,
  },
});

/** One option: bare until chosen, then a raised card-coloured segment. */
const segmentedItemVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1 font-semibold whitespace-nowrap text-foreground-secondary transition-all outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[pressed]:bg-card data-[pressed]:text-foreground data-[pressed]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      size: {
        default: "h-8 min-w-8 rounded-lg px-3.5 text-body",
        sm: "h-7 min-w-7 rounded-md px-2.5 text-body-sm [&_svg:not([class*='size-'])]:size-3.5",
      },
      fill: {
        true: "min-w-0 flex-1 basis-0",
        false: "",
      },
    },
    defaultVariants: {
      size: "default",
      fill: false,
    },
  },
);

export { segmentedTrackVariants, segmentedItemVariants };
