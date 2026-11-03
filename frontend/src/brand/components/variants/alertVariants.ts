import { cva } from "class-variance-authority";

/**
 * A callout. `tone` picks the status colour and `variant` how loudly it is
 * used: solid fills with it (the default), outline rings a card in it.
 */
const alertVariants = cva(
  "group/alert relative grid w-full gap-y-0.5 rounded-xl border-callout py-3 pr-3 pl-3.5 text-left text-body has-data-[slot=alert-action]:pr-18 has-data-[slot=alert-dismiss]:pr-11 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:mt-px *:[svg]:self-start *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4.5",
  {
    variants: {
      tone: {
        info: "[--alert-fill:var(--status-info-base)] [--alert-ink:var(--status-info-on-base)] [--alert-tone:var(--status-info-text)]",
        success:
          "[--alert-fill:var(--status-success-base)] [--alert-ink:var(--status-success-on-base)] [--alert-tone:var(--status-success-text)]",
        warning:
          "[--alert-fill:var(--status-warning-base)] [--alert-ink:var(--status-warning-on-base)] [--alert-tone:var(--status-warning-text)]",
        danger:
          "[--alert-fill:var(--status-danger-base)] [--alert-ink:var(--status-danger-on-base)] [--alert-tone:var(--status-danger-text)]",
      },
      variant: {
        solid: "border-(--alert-fill) bg-(--alert-fill) text-(--alert-ink)",
        outline:
          "border-(--alert-tone) bg-card text-foreground-secondary *:[svg]:text-(--alert-tone) *:data-[slot=alert-link]:text-(--alert-tone) *:data-[slot=alert-title]:text-foreground *:data-[slot=alert-dismiss]:text-muted-foreground",
      },
    },
    defaultVariants: {
      tone: "info",
      variant: "solid",
    },
  },
);

export { alertVariants };
