import * as React from "react";
import { cn } from "@/brand/cn";

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
