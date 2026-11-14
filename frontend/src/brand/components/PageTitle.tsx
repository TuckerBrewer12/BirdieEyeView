import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/brand/cn";
import { pageTitleVariants } from "./variants";

function PageTitle({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<"h1"> & VariantProps<typeof pageTitleVariants> & { children: React.ReactNode }) {
  return (
    <h1
      data-slot="page-title"
      className={cn(pageTitleVariants({ size, className }))}
      {...props}
    >
      {children}
    </h1>
  );
}

export { PageTitle };
