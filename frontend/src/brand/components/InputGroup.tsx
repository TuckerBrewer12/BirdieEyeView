import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/brand/cn";
import { Input } from "./Input";
import { Button } from "./Button";
import {
  inputGroupVariants,
  inputGroupAddonVariants,
  inputGroupButtonVariants,
} from "./variants";

const InputGroupSizeContext = React.createContext<
  NonNullable<VariantProps<typeof inputGroupVariants>["size"]>
>("default");

function InputGroup({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupVariants>) {
  return (
    <InputGroupSizeContext.Provider value={size ?? "default"}>
      <div
        data-slot="input-group"
        data-size={size}
        role="group"
        className={cn(inputGroupVariants({ size }), className)}
        {...props}
      />
    </InputGroupSizeContext.Provider>
  );
}

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return;
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus();
      }}
      {...props}
    />
  );
}

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "type"> &
  VariantProps<typeof inputGroupButtonVariants> & {
    type?: "button" | "submit" | "reset";
  }) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupInput({
  className,
  size,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "size"> & {
  size?: VariantProps<typeof inputGroupVariants>["size"];
}) {
  const groupSize = React.useContext(InputGroupSizeContext);

  return (
    <Input
      data-slot="input-group-control"
      size={size ?? groupSize}
      className={cn(
        "h-full flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
};
