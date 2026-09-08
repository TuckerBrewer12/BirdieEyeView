import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/brand/cn";
import { pageTitleVariants } from "./variants";

function PageTitle({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"h1"> & VariantProps<typeof pageTitleVariants>) {
  return (
    <h1
      data-slot="page-title"
      className={cn(pageTitleVariants({ size, className }))}
      {...props}
    />
  );
}

export { PageTitle };
