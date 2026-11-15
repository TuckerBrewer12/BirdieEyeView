import * as React from "react";
import { CircleAlert } from "lucide-react";
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

function FieldLabel({
  className,
  htmlFor,
  ...props
}: React.ComponentProps<"label">) {
  return (
    <label
      htmlFor={htmlFor}
      data-slot="field-label"
      className={cn(
        "text-body font-semibold text-foreground select-none group-has-disabled/field:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function FieldError({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"p">, "children"> & { children?: string | null }) {
  if (!children) return null;

  return (
    <p
      data-slot="field-error"
      role="alert"
      className={cn("flex items-center gap-1.5 text-body font-medium text-destructive", className)}
      {...props}
    >
      <CircleAlert aria-hidden className="size-4 shrink-0 fill-current stroke-card" />
      {children}
    </p>
  );
}

export { Field, FieldLabel, FieldError };
