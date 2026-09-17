import * as React from "react";
import { cn } from "@/brand/cn";

/**
 * A labelled form control with its helper text and validation message.
 *
 * Every auth screen wrote this by hand — a `<label>`, an input, then a
 * paragraph underneath — and the label size, the gap and the error colour had
 * all drifted apart by the time there were five of them.
 *
 * The part that is easy to lose when it is written inline is the wiring:
 * `FieldLabel` needs `htmlFor`, and the control needs `aria-describedby`
 * pointing at whichever of the description or the error is on screen. Pass an
 * `id` and the ids line up by convention — `<id>-description`, `<id>-error`.
 */
function Field({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field"
      className={cn("group/field flex w-full flex-col gap-1.5", className)}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="field-label"
      className={cn(
        "text-xs font-semibold text-muted-foreground select-none group-has-disabled/field:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-xs font-normal text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * Renders nothing when there is no message, so a view can hand it a view
 * model's nullable error straight through without a ternary in the JSX.
 */
function FieldError({ className, children, ...props }: React.ComponentProps<"p">) {
  if (!children) return null;

  return (
    <p
      data-slot="field-error"
      role="alert"
      className={cn("text-xs font-medium text-destructive", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export { Field, FieldLabel, FieldDescription, FieldError };
