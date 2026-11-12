import { cva } from "class-variance-authority";

const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1 rounded-lg text-sm font-medium whitespace-nowrap transition-all outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/half disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/wash aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:border-primary data-[pressed]:bg-primary data-[pressed]:text-primary-foreground data-[pressed]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary dark:aria-invalid:ring-destructive/recessed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        /* One option of a segmented control: bare until chosen, then a raised card-coloured pill. */
        segmented:
          "rounded-full font-semibold text-foreground-secondary hover:bg-transparent aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm data-[pressed]:bg-card data-[pressed]:text-foreground data-[pressed]:shadow-sm",
        /* One of a row of chips, a gap apart: a white pill ringed in the input's line, the chosen one ringed in ink and bold. */
        chip: "h-9 gap-2 rounded-full bg-card px-3.5 text-body font-medium text-foreground ring-1 ring-input hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-transparent aria-pressed:bg-card aria-pressed:font-bold aria-pressed:text-foreground aria-pressed:ring-2 aria-pressed:ring-foreground aria-pressed:hover:bg-card data-[pressed]:border-transparent data-[pressed]:bg-card data-[pressed]:font-bold data-[pressed]:text-foreground data-[pressed]:ring-2 data-[pressed]:ring-foreground data-[pressed]:hover:bg-card",
      },
      size: {
        default:
          "h-8 min-w-8 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        sm: "h-7 min-w-7 rounded-md px-2.5 text-body-sm has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    compoundVariants: [
      { variant: "segmented", size: "default", class: "px-3.5 text-body" },
      // A segmented track is a pill, so its small options are pills too, not boxes inside it.
      { variant: "segmented", size: "sm", class: "rounded-full" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export { toggleVariants };
