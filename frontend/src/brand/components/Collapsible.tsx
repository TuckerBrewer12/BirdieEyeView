import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

const CloseContext = React.createContext<(() => void) | null>(null);

interface CollapsibleProps extends Omit<CollapsiblePrimitive.Root.Props, "onOpenChange"> {
  onOpenChange?: (open: boolean) => void;
}

function Collapsible({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );
  const close = React.useCallback(() => setOpen(false), [setOpen]);

  return (
    <CloseContext.Provider value={close}>
      <CollapsiblePrimitive.Root
        data-slot="collapsible"
        open={open}
        onOpenChange={setOpen}
        {...props}
      />
    </CloseContext.Provider>
  );
}

function CollapsibleTrigger(props: CollapsiblePrimitive.Trigger.Props) {
  return <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />;
}

function CollapsibleContent(props: CollapsiblePrimitive.Panel.Props) {
  return <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />;
}

function CollapsibleClose({ onClick, ...props }: ButtonPrimitive.Props) {
  const close = React.useContext(CloseContext);
  return (
    <ButtonPrimitive
      data-slot="collapsible-close"
      onClick={(event) => {
        onClick?.(event);
        close?.();
      }}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent, CollapsibleClose };
export type { CollapsibleProps };
