import * as React from "react";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cn } from "@/brand/cn";
import { segmentedItemVariants, segmentedTrackVariants } from "./variants";

type SegmentedSize = "default" | "sm";

const ToggleGroupContext = React.createContext<{ size: SegmentedSize; fill: boolean }>({
  size: "default",
  fill: false,
});

type ToggleGroupProps = ToggleGroupPrimitive.Props & {
  /** `default` is 32 on the page; `sm` is the compact 28 for a card header. */
  size?: SegmentedSize;
  /** Stretch to the row, the options sharing its width equally (a phone). */
  fill?: boolean;
};

/**
 * A segmented control: two to four short options on a recessed track, one raised.
 * It switches a view in place; more options, or long labels, belong in a menu.
 */
function ToggleGroup({ className, size = "default", fill = false, children, ...props }: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-size={size}
      className={cn(segmentedTrackVariants({ size, fill }), className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ size, fill }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  );
}

function ToggleGroupItem({ className, children, ...props }: TogglePrimitive.Props) {
  const { size, fill } = React.useContext(ToggleGroupContext);

  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      data-size={size}
      className={cn(segmentedItemVariants({ size, fill }), className)}
      {...props}
    >
      {children}
    </TogglePrimitive>
  );
}

export { ToggleGroup, ToggleGroupItem };
