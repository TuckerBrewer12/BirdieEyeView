import * as React from "react";
import { Dialog as ActionSheetPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/brand/cn";
import { SheetPortal } from "./Sheet";

/**
 * A mobile list of actions where the player does one. It rises from the
 * bottom as two floating cards: the actions under a title, and a Cancel
 * apart from them. Choosing an action closes the sheet.
 *
 * `Sheet side="bottom"` is the sibling for picking one option from a list.
 */

function ActionSheet(props: ActionSheetPrimitive.Root.Props) {
  return <ActionSheetPrimitive.Root data-slot="action-sheet" {...props} />;
}

function ActionSheetTrigger(props: ActionSheetPrimitive.Trigger.Props) {
  return <ActionSheetPrimitive.Trigger data-slot="action-sheet-trigger" {...props} />;
}

function ActionSheetContent({
  className,
  children,
  title,
  contained = false,
  ...props
}: Omit<ActionSheetPrimitive.Popup.Props, "title"> & {
  /** What the actions are for. Shown above them and read as the sheet's name. */
  title: string;
  /** Hosts the sheet inside its nearest positioned parent instead of over the page. */
  contained?: boolean;
}) {
  return (
    <SheetPortal contained={contained}>
      <ActionSheetPrimitive.Popup
        data-slot="action-sheet-content"
        className={cn(
          "inset-x-0 bottom-0 z-50 flex flex-col gap-2 px-2.5 pb-3.5 text-card-foreground outline-none transition-transform duration-200 ease-out data-ending-style:translate-y-full data-starting-style:translate-y-full",
          contained ? "absolute" : "fixed",
          className,
        )}
        {...props}
      >
        <div role="menu" aria-label={title} className="overflow-hidden rounded-2xl bg-card">
          <ActionSheetPrimitive.Title
            data-slot="action-sheet-title"
            className="border-b border-chart-grid px-4 py-3 text-center text-body font-normal text-muted-foreground"
          >
            {title}
          </ActionSheetPrimitive.Title>
          {children}
        </div>
        <ActionSheetPrimitive.Close
          data-slot="action-sheet-cancel"
          className="h-14 rounded-2xl bg-card text-lg font-bold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Cancel
        </ActionSheetPrimitive.Close>
      </ActionSheetPrimitive.Popup>
    </SheetPortal>
  );
}

/** One action: an icon and a label in the primary colour. Choosing it closes the sheet. */
function ActionSheetAction({
  className,
  children,
  icon,
  ...props
}: Omit<ActionSheetPrimitive.Close.Props, "role"> & { icon?: React.ReactNode }) {
  return (
    <ActionSheetPrimitive.Close
      role="menuitem"
      data-slot="action-sheet-action"
      className={cn(
        "flex h-14 w-full items-center justify-center gap-2.5 border-t border-chart-grid text-lg font-medium text-primary outline-none first-of-type:border-t-0 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-5",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </ActionSheetPrimitive.Close>
  );
}

export { ActionSheet, ActionSheetTrigger, ActionSheetContent, ActionSheetAction };
