import { cva } from "class-variance-authority";

const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1 rounded-lg text-sm font-medium whitespace-nowrap transition-all outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/half disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/wash aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:border-primary data-[pressed]:bg-primary data-[pressed]:text-primary-foreground data-[pressed]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary dark:aria-invalid:ring-destructive/recessed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-input bg-transparent hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:border-primary data-[pressed]:bg-primary data-[pressed]:text-primary-foreground data-[pressed]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary",
        /* A filter you switch on and off: tinted, not filled, when on. */
        chip: "border border-border bg-card text-body text-foreground aria-pressed:border-primary/40 aria-pressed:bg-accent aria-pressed:text-primary aria-pressed:hover:bg-accent data-[pressed]:border-primary/40 data-[pressed]:bg-accent data-[pressed]:text-primary",
      },
      size: {
        default:
          "h-8 min-w-8 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        sm: "h-7 min-w-7 rounded-md px-2.5 text-body-sm has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    compoundVariants: [{ variant: "segmented", size: "default", class: "px-3.5 text-body" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export { toggleVariants };
