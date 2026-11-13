import { cva } from "class-variance-authority";

/**
 * A callout. `tone` picks the status colour and `variant` how loudly it is
 * used: solid fills with it (the default), outline rings a card in it. Each
 * pairing is a `compoundVariants` entry over the `status` tokens.
 */
const alertVariants = cva(
  "group/alert relative grid w-full gap-y-0.5 rounded-xl border-callout p-3 text-left text-body has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 has-data-[slot=alert-action]:gap-x-3 md:has-data-[slot=alert-action]:grid-cols-[1fr_auto] md:has-[>svg]:has-data-[slot=alert-action]:grid-cols-[auto_1fr_auto] *:[svg]:mt-px *:[svg]:self-start *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      tone: {
        info: "",
        success: "",
        warning: "",
        danger: "",
      },
      variant: {
        solid: "",
        outline: "bg-card text-foreground-secondary *:data-[slot=alert-title]:text-foreground",
      },
    },
    compoundVariants: [
      { variant: "solid", tone: "info", className: "border-status-info-base bg-status-info-base text-status-info-on-base" },
      { variant: "solid", tone: "success", className: "border-status-success-base bg-status-success-base text-status-success-on-base" },
      { variant: "solid", tone: "warning", className: "border-status-warning-base bg-status-warning-base text-status-warning-on-base" },
      { variant: "solid", tone: "danger", className: "border-status-danger-base bg-status-danger-base text-status-danger-on-base" },
      { variant: "outline", tone: "info", className: "border-status-info *:[svg]:text-status-info" },
      { variant: "outline", tone: "success", className: "border-status-success *:[svg]:text-status-success" },
      { variant: "outline", tone: "warning", className: "border-status-warning *:[svg]:text-status-warning" },
      { variant: "outline", tone: "danger", className: "border-status-danger *:[svg]:text-status-danger" },
    ],
    defaultVariants: {
      variant: "solid",
    },
  },
);

export { alertVariants };
