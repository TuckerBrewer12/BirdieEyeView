import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/brand/cn";
import { inputVariants } from "./variants";

function Input({
  className,
  type,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(inputVariants({ size }), className)}
      {...props}
    />
  );
}

export { Input };
