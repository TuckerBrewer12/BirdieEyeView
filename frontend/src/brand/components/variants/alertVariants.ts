import { cva } from "class-variance-authority";

const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        destructive:
          "border-destructive/medium bg-card text-destructive *:data-[slot=alert-description]:text-destructive/opaque *:[svg]:text-current",
        /* A request that went through: a link sent, a password changed. Pass
           role="status" with it, since it is news rather than a problem. */
        success:
          "border-primary/medium bg-accent text-accent-foreground *:data-[slot=alert-description]:text-accent-foreground *:[svg]:text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export { alertVariants };
