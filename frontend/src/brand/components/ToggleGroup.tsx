import * as React from "react";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cn } from "@/brand/cn";
import { toggleVariants } from "./variants";

type SegmentedSize = "default" | "sm";

type ToggleLook = "segmented" | "boxed" | "chips";

const ToggleGroupContext = React.createContext<{ size: SegmentedSize; fill: boolean; look: ToggleLook }>({
  size: "default",
  fill: false,
  look: "segmented",
});

type ToggleGroupProps = ToggleGroupPrimitive.Props & {
  size?: SegmentedSize;
  fill?: boolean;
  look?: ToggleLook;
};

function ToggleGroup({
  className,
  size = "default",
  fill = false,
  look = "segmented",
  children,
  ...props
}: ToggleGroupProps) {
  const chips = look === "chips";
  const boxed = look === "boxed";
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-size={size}
      className={cn(
        chips && "flex flex-wrap items-center gap-2",
        boxed && "flex items-center gap-0.5 rounded-xl bg-muted p-1",
        look === "segmented" && ["flex items-center gap-0.5 rounded-full bg-muted", size === "sm" ? "p-0.5" : "p-chip"],
        fill ? "w-full" : "w-fit",
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ size, fill, look }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  );
}

function ToggleGroupItem({ className, children, ...props }: TogglePrimitive.Props) {
  const { size, fill, look } = React.useContext(ToggleGroupContext);

  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      data-size={size}
      className={cn(
        look === "chips" && toggleVariants({ variant: "chip" }),
        look === "boxed" && toggleVariants({ variant: "boxed" }),
        look === "segmented" && toggleVariants({ variant: "segmented", size }),
        fill ? "min-w-0 flex-1 basis-0" : "shrink-0",
        className,
      )}
      {...props}
    >
      {children}
    </TogglePrimitive>
  );
}

export { ToggleGroup, ToggleGroupItem };
