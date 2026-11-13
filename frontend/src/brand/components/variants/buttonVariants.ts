import { cva } from "class-variance-authority";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-card border border-transparent text-sm font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/half active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/wash dark:aria-invalid:ring-destructive/recessed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        /* The board's Secondary: outlined on the card white, the border darkening to the ink on hover. */
        outline:
          "border-input bg-card text-foreground hover:border-foreground aria-expanded:border-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/half",
        destructive:
          "bg-destructive text-status-danger-on-base hover:bg-destructive-hover focus-visible:border-destructive/recessed focus-visible:ring-destructive/wash dark:focus-visible:ring-destructive/recessed",
        /* A way out that loses something, beside the main action: Discard. Red ink, no fill. */
        ghostDestructive: "text-destructive hover:bg-destructive/tint",
        /* The board's Text: no fill, underlined on hover. */
        link: "text-primary underline-offset-4 decoration-2 hover:underline",
        linkMuted: "text-muted-foreground transition-colors hover:text-primary",
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
        /* A link set in a line of text, with no box of its own: "Back to courses", "Sign in". */
        inline: "h-auto gap-1.5 p-0 text-body [&_svg:not([class*='size-'])]:size-3.5",
        /* A page's toolbar, as round detail's: 44 tall, between default and lg. */
        toolbar: "h-11 gap-1.5 rounded-xl px-5 has-data-[icon=inline-start]:pl-3",
        "toolbar-icon": "size-11 rounded-xl",
        /* An icon alone on a phone, the icon and its word from md: Share, Edit. */
        "toolbar-icon-phone": "size-11 rounded-xl md:w-auto md:gap-1.5 md:px-5",
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
