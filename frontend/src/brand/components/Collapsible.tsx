import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

/**
 * A disclosure that owns its open state, with shadcn's slot names
 * (Trigger / Content) plus a Close part like the Sheet's.
 *
 * Close is the reason this is not a bare re-export: Base UI only toggles
 * from the trigger, but a menu of links has to fold itself up once a link
 * is taken. With Close the page never holds the open boolean.
 *
 * The trigger carries `data-panel-open` while open, so icons can swap with
 * `in-data-panel-open:` instead of reading state.
 */
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

/** Runs its own click, then folds the collapsible it sits in. */
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
