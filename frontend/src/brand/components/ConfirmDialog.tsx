import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { cn } from "@/brand/cn";
import { Button } from "./Button";

/**
 * Where the dialog sits. `auto` opens from the bottom on a phone and centres
 * from `sm` up; the other two pin one layout, which is how the brand preview
 * shows both at once.
 */
type ConfirmDialogPlacement = "auto" | "center" | "bottom";

/*
 * Every layout is one string, so a pinned layout reads as plain classes and
 * `auto` is the bottom layout with `sm:` resets rather than a third design.
 */
const viewport: Record<ConfirmDialogPlacement, string> = {
  center: "items-center justify-center p-4",
  bottom: "items-end",
  auto: "items-end sm:items-center sm:justify-center sm:p-4",
};

const popup: Record<ConfirmDialogPlacement, string> = {
  center:
    "max-w-sm gap-2 rounded-2xl p-6 shadow-lg data-ending-style:scale-95 data-starting-style:scale-95",
  bottom:
    "gap-1.5 rounded-t-sheet px-5 pt-6 pb-6 data-ending-style:translate-y-full data-starting-style:translate-y-full",
  auto: "gap-1.5 rounded-t-sheet px-5 pt-6 pb-6 data-ending-style:translate-y-full data-starting-style:translate-y-full sm:max-w-sm sm:gap-2 sm:rounded-2xl sm:p-6 sm:shadow-lg sm:data-ending-style:translate-y-0 sm:data-starting-style:translate-y-0 sm:data-ending-style:scale-95 sm:data-starting-style:scale-95",
};

const footer: Record<ConfirmDialogPlacement, string> = {
  center: "flex-row justify-end gap-2",
  bottom: "flex-col-reverse gap-1.5",
  auto: "flex-col-reverse gap-1.5 sm:flex-row sm:justify-end sm:gap-2",
};

const action: Record<ConfirmDialogPlacement, string> = {
  center: "h-10 rounded-card px-4 text-sm font-semibold",
  bottom: "h-12 rounded-xl text-base font-semibold",
  auto: "h-12 rounded-xl text-base font-semibold sm:h-10 sm:rounded-card sm:px-4 sm:text-sm",
};

/** Cancel is a bordered button beside the confirm, and plain text under it. */
const cancel: Record<ConfirmDialogPlacement, string> = {
  center: "border-input bg-card",
  bottom: "",
  auto: "sm:border-input sm:bg-card",
};

/** Red is for actions that destroy data; every other confirm stays primary. */
const destructiveAction =
  "bg-status-danger-base text-status-danger-on-base hover:bg-destructive-hover";

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
    placement?: ConfirmDialogPlacement;
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
  placement = "auto",
  trigger,
  contained = false,
  className,
  ...props
}: ConfirmDialogProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const dialog = (
    <AlertDialogPrimitive.Portal
      data-slot="confirm-dialog-portal"
      container={contained ? containerRef : undefined}
    >
      <AlertDialogPrimitive.Backdrop
        data-slot="confirm-dialog-overlay"
        className={cn(
          "z-50 bg-foreground/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0",
          contained ? "absolute inset-0" : "fixed inset-0",
        )}
      />
      <AlertDialogPrimitive.Viewport
        data-slot="confirm-dialog-viewport"
        className={cn(
          "z-50 flex",
          contained ? "absolute inset-0" : "fixed inset-0",
          viewport[placement],
        )}
      >
        <AlertDialogPrimitive.Popup
          data-slot="confirm-dialog"
          className={cn(
            "flex w-full flex-col bg-card text-card-foreground outline-none transition-[opacity,translate,scale] duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0",
            popup[placement],
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
          <div className={cn("mt-3 flex", footer[placement])}>
            <AlertDialogPrimitive.Close
              render={
                <Button
                  variant="ghost"
                  className={cn(action[placement], cancel[placement])}
                />
              }
            >
              {cancelLabel}
            </AlertDialogPrimitive.Close>
            <AlertDialogPrimitive.Close
              onClick={onConfirm}
              render={
                <Button
                  className={cn(
                    action[placement],
                    destructive && destructiveAction,
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
    <AlertDialogPrimitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
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
export type { ConfirmDialogProps, ConfirmDialogPlacement };
