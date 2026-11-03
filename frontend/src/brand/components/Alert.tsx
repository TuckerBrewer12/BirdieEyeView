import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/brand/cn";
import { alertVariants } from "./variants";

/**
 * Danger interrupts a screen reader; the other tones are news and wait their
 * turn. Pass `role` to say otherwise.
 */
function Alert({
  className,
  tone,
  variant,
  role,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
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

/** The next step the alert points at: a link under its text. */
function AlertLink({ className, ...props }: React.ComponentProps<"a">) {
  return (
    <a
      data-slot="alert-link"
      className={cn(
        "mt-1 w-fit font-semibold underline underline-offset-2 group-has-[>svg]/alert:col-start-2",
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

/** The close button for an alert that can be put away; the caller decides what dismissing does. */
function AlertDismiss({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="alert-dismiss"
      aria-label="Dismiss"
      className={cn(
        "absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-md text-current outline-none hover:bg-current/10 focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    >
      <X className="size-3.5" strokeWidth={2.5} />
    </button>
  );
}

export { Alert, AlertTitle, AlertDescription, AlertLink, AlertAction, AlertDismiss };
