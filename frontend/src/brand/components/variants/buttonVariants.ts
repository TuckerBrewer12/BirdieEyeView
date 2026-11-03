import { cva } from "class-variance-authority";

/*
 * Each hover style is repeated under `data-hover`, so a preview or a design
 * review can show the hover state without a pointer over it.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-card border border-transparent text-sm font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover data-hover:bg-primary-hover",
        /* The board's Secondary: outlined, the border darkening to the ink on hover. */
        outline:
          "border-input bg-transparent text-foreground hover:border-foreground data-hover:border-foreground aria-expanded:border-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover data-hover:bg-secondary-hover aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground data-hover:bg-muted data-hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive text-status-danger-on-base hover:bg-destructive-hover data-hover:bg-destructive-hover focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        /* The board's Text: no fill, underlined on hover. */
        link: "text-primary underline-offset-4 decoration-2 hover:underline data-hover:underline",
        linkMuted: "text-muted-foreground transition-colors hover:text-primary data-hover:text-primary",
      },
      /* The board's 48 / 40 / 32 are lg / default / sm; the radius steps up with the height. */
      size: {
        default:
          "h-10 gap-2 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-lg px-2.5 text-body has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 rounded-xl px-5 text-body-lg has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10",
        "icon-xs":
          "size-6 rounded-md in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-12 rounded-xl",
        /* Marketing-sized. The landing page's calls to action sit alone on a
           wide section and have to carry it; the in-app sizes read as chrome
           at that scale. */
        cta: "h-12 gap-2 rounded-xl px-7 text-base has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5 [&_svg:not([class*='size-'])]:size-5",
      },
      /* Declared after size so the radius here wins the twMerge. */
      shape: {
        default: "",
        pill: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "default",
    },
  },
);

export { buttonVariants };
