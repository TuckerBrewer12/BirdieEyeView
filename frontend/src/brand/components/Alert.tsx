import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/brand/cn";
import { alertVariants } from "./variants";

type AlertVariantProps = VariantProps<typeof alertVariants>;

/**
 * Every alert names its `tone`; there is no default colour. Danger interrupts
 * a screen reader; the other tones are news and wait their turn. Pass `role`
 * to say otherwise.
 */
function Alert({
  className,
  tone,
  variant,
  role,
  ...props
}: React.ComponentProps<"div"> & {
  tone: NonNullable<AlertVariantProps["tone"]>;
  variant?: AlertVariantProps["variant"];
}) {
  return (
    <div
      data-slot="alert"
      role={role ?? (tone === "danger" ? "alert" : "status")}
      className={cn(alertVariants({ tone, variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-semibold group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-2",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "leading-snug text-pretty group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-2 [&_p:not(:last-child)]:mb-4",
        className,
      )}
      {...props}
    />
  );
}

/** A control pinned to the top right, such as a retry button. */
function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2 right-2", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
