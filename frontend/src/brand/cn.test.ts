import { describe, expect, it } from "vitest";
import { cn } from "./cn";
import { buttonVariants } from "./components/variants";

describe("cn", () => {
  it("keeps primary foreground when merging a type-scale size", () => {
    expect(cn("bg-primary text-primary-foreground", "text-button-sm")).toContain(
      "text-primary-foreground",
    );
  });

  it("keeps white label on a primary sm button", () => {
    const classes = cn(buttonVariants({ variant: "default", size: "sm", className: "px-3.5 text-[13px]" }));
    expect(classes).toContain("text-primary-foreground");
  });
});
