import type * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/brand/cn";
import { buttonVariants } from "./variants";

function Button({
  className,
  variant = "default",
  size = "default",
  shape = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, shape, className }))}
      {...props}
    />
  );
}

/**
 * A whole list row that opens something: no box of its own, so the row lays itself out and
 * picks its hover. Left-aligned like the text it holds, with the hover fading in.
 */
function RowButton({ className, type = "button", ...props }: React.ComponentProps<"button">) {
  return (
    <button
      data-slot="row-button"
      type={type}
      className={cn("text-left transition-colors", className)}
      {...props}
    />
  );
}

/** A bare ✕ that closes or clears what it sits on, in a card's corner or beside a field. */
function ClearButton({ label, className, ...props }: Omit<React.ComponentProps<"button">, "children"> & { label: string }) {
  return (
    <button
      data-slot="clear-button"
      type="button"
      title={label}
      aria-label={label}
      className={cn("inline-flex text-muted-foreground hover:text-foreground", className)}
      {...props}
    >
      <X className="size-4" />
    </button>
  );
}

export { Button, ClearButton, RowButton };
