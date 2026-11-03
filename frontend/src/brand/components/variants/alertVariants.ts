import { cva } from "class-variance-authority";

/**
 * A callout. `tone` is what it says (info, success, warning, danger) and
 * `variant` how loudly: solid fills with the status colour (the default),
 * outline rings a card in it. A solid alert's ink is white on every tone.
 */
const alertVariants = cva(
  "group/alert relative grid w-full gap-y-0.5 rounded-xl border-callout py-3 pr-3 pl-3.5 text-left text-body has-data-[slot=alert-action]:pr-18 has-data-[slot=alert-dismiss]:pr-11 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:mt-px *:[svg]:self-start *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4.5",
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
        outline:
          "bg-card text-foreground-secondary *:data-[slot=alert-title]:text-foreground *:data-[slot=alert-dismiss]:text-muted-foreground",
      },
    },
    compoundVariants: [
      {
        variant: "solid",
        tone: "info",
        class: "border-status-info-base bg-status-info-base text-status-info-on-base",
      },
      {
        variant: "solid",
        tone: "success",
        class: "border-status-success-base bg-status-success-base text-status-success-on-base",
      },
      {
        variant: "solid",
        tone: "warning",
        class: "border-status-warning-base bg-status-warning-base text-status-warning-on-base",
      },
      {
        variant: "solid",
        tone: "danger",
        class: "border-status-danger-base bg-status-danger-base text-status-danger-on-base",
      },
      {
        variant: "outline",
        tone: "info",
        class: "border-status-info *:[svg]:text-status-info *:data-[slot=alert-link]:text-status-info",
      },
      {
        variant: "outline",
        tone: "success",
        class: "border-status-success *:[svg]:text-status-success *:data-[slot=alert-link]:text-status-success",
      },
      {
        variant: "outline",
        tone: "warning",
        class: "border-status-warning *:[svg]:text-status-warning *:data-[slot=alert-link]:text-status-warning",
      },
      {
        variant: "outline",
        tone: "danger",
        class: "border-status-danger *:[svg]:text-status-danger *:data-[slot=alert-link]:text-status-danger",
      },
    ],
    defaultVariants: {
      tone: "info",
      variant: "solid",
    },
  },
);

export { alertVariants };
