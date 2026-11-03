import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { cn } from "@/brand/cn";
import { Button } from "./Button";

/*
 * The layout follows the room the dialog has, not the device: under `@md`
 * (448px) it rises from the bottom with stacked buttons, from there up it is
 * centred with the buttons in a row. A container query, so a contained
 * dialog lays out by its box, and the preview shows both side by side.
 */
const actionClass = "h-12 rounded-xl text-base font-semibold @md:h-10 @md:rounded-card @md:px-4 @md:text-sm";

type ConfirmDialogProps = Pick<
  AlertDialogPrimitive.Root.Props,
  "open" | "defaultOpen" | "onOpenChange"
> &
  Omit<AlertDialogPrimitive.Popup.Props, "title" | "children"> & {
    /** The question, e.g. "Delete this round?". */
    title: string;
    /** What is at stake, e.g. the round's course, date and score. */
    detail?: string;
    /** Names the action: "Delete round", never "OK" or "Yes". */
    confirmLabel: string;
    cancelLabel?: string;
    /** Set only when confirming destroys data; it turns the confirm red. */
    destructive?: boolean;
    onConfirm?: () => void;
    /** The element that opens the dialog, when the page doesn't control `open`. */
    trigger?: React.ReactElement;
    /** Hosts the dialog inside its nearest positioned parent instead of over the page. */
    contained?: boolean;
  };

function ConfirmDialog({
  open,
  defaultOpen,
  onOpenChange,
  title,
  detail,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  trigger,
  contained = false,
  className,
  ...props
}: ConfirmDialogProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const position = contained ? "absolute inset-0" : "fixed inset-0";

  const dialog = (
    <AlertDialogPrimitive.Portal
      data-slot="confirm-dialog-portal"
      container={contained ? containerRef : undefined}
    >
      <AlertDialogPrimitive.Backdrop
        data-slot="confirm-dialog-overlay"
        className={cn(
          "z-50 bg-foreground/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0",
          position,
        )}
      />
      <AlertDialogPrimitive.Viewport
        data-slot="confirm-dialog-viewport"
        className={cn("@container z-50 flex items-end", position)}
      >
        <AlertDialogPrimitive.Popup
          data-slot="confirm-dialog"
          className={cn(
            "flex w-full flex-col gap-1.5 rounded-t-sheet bg-card px-5 py-6 text-card-foreground outline-none transition-[opacity,translate,scale] duration-200 ease-out data-ending-style:translate-y-full data-ending-style:opacity-0 data-starting-style:translate-y-full data-starting-style:opacity-0",
            "@md:m-auto @md:max-w-sm @md:gap-2 @md:rounded-2xl @md:p-6 @md:shadow-lg @md:data-ending-style:translate-y-0 @md:data-ending-style:scale-95 @md:data-starting-style:translate-y-0 @md:data-starting-style:scale-95",
            className,
          )}
          {...props}
        >
          <AlertDialogPrimitive.Title className="text-lg font-bold">
            {title}
          </AlertDialogPrimitive.Title>
          {detail && (
            <AlertDialogPrimitive.Description className="text-sm text-foreground-secondary">
              {detail}
            </AlertDialogPrimitive.Description>
          )}
          <div className="mt-3 flex flex-col-reverse gap-1.5 @md:flex-row @md:justify-end @md:gap-2">
            {/* Plain text under the confirm on a phone, a bordered button beside it on a wide screen. */}
            <AlertDialogPrimitive.Close
              render={<Button variant="ghost" className={cn(actionClass, "@md:border-input @md:bg-card")} />}
            >
              {cancelLabel}
            </AlertDialogPrimitive.Close>
            <AlertDialogPrimitive.Close
              onClick={onConfirm}
              render={
                <Button
                  className={cn(
                    actionClass,
                    destructive && "bg-status-danger-base text-status-danger-on-base hover:bg-destructive-hover",
                  )}
                />
              }
            >
              {confirmLabel}
            </AlertDialogPrimitive.Close>
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Viewport>
    </AlertDialogPrimitive.Portal>
  );

  return (
    <AlertDialogPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger && <AlertDialogPrimitive.Trigger render={trigger} />}
      {contained ? (
        <div ref={containerRef} className="absolute inset-0 overflow-hidden">
          {dialog}
        </div>
      ) : (
        dialog
      )}
    </AlertDialogPrimitive.Root>
  );
}

export { ConfirmDialog };
export type { ConfirmDialogProps };
