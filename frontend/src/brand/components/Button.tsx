import { useRender } from "@base-ui/react/use-render";
import type * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { type VariantProps } from "class-variance-authority";
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

function RowButton({
  className,
  type = "button",
  render,
  ...props
}: React.ComponentProps<"button"> & { render?: useRender.RenderProp }) {
  return useRender({
    defaultTagName: "button",
    render,
    props: {
      "data-slot": "row-button",
      ...props,
      type: render ? undefined : type,
      className: cn("text-left transition-colors", className),
    },
  });
}

export { Button, RowButton };
