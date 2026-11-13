import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

/**
 * A disclosure with shadcn's slot names (Trigger / Content).
 *
 * The trigger carries `data-panel-open` while open, so icons can swap with
 * `in-data-panel-open:` instead of reading state.
 */
function Collapsible(props: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger(props: CollapsiblePrimitive.Trigger.Props) {
  return <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />;
}

function CollapsibleContent(props: CollapsiblePrimitive.Panel.Props) {
  return <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />;
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
