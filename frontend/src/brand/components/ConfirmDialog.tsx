import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { cn } from "@/brand/cn";
import { Button } from "./Button";
import { SheetPortal } from "./Sheet";

type ConfirmDialogProps = Pick<AlertDialogPrimitive.Root.Props, "open" | "onOpenChange"> &
  Omit<AlertDialogPrimitive.Popup.Props, "title" | "children"> & {
    /** The question, e.g. "Delete this round?". */
    title: string;
    /** What is at stake, e.g. "This can't be undone." */
    detail?: string;
    /** Names the action: "Delete round", never "OK" or "Yes". */
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
    /** Holds the confirm (and its label) while the action runs. */
    pending?: boolean;
    /** Hosts the dialog inside its nearest positioned parent instead of over the page. */
    contained?: boolean;
  };

/**
 * Asks before something that can't be undone. It opens over `Sheet`'s portal
 * and dim, and lays out by the room it has (a container query): under `@md`
 * it rises from the bottom with the buttons stacked, from there up it is
 * centred with the buttons in a row. The confirm is the kit's destructive
 * button; Cancel is outlined beside it and plain under it.
 */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  detail,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  pending = false,
  contained = false,
  className,
  ...props
}: ConfirmDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <SheetPortal contained={contained}>
        <AlertDialogPrimitive.Viewport
          data-slot="confirm-dialog-viewport"
          className={cn("@container inset-0 z-50 flex items-end", contained ? "absolute" : "fixed")}
        >
          <AlertDialogPrimitive.Popup
            data-slot="confirm-dialog"
            className={cn(
              "flex w-full flex-col gap-1.5 rounded-t-sheet bg-card px-5 pt-2.5 pb-8 text-card-foreground outline-none transition duration-200 ease-out data-ending-style:translate-y-full data-ending-style:opacity-0 data-starting-style:translate-y-full data-starting-style:opacity-0",
              "@md:m-auto @md:max-w-100 @md:rounded-2xl @md:p-6 @md:shadow-lg @md:data-ending-style:translate-y-0 @md:data-ending-style:scale-95 @md:data-starting-style:translate-y-0 @md:data-starting-style:scale-95",
              className,
            )}
            {...props}
          >
            {/* The bottom sheet's handle, as `Sheet` draws it; the centred dialog has none. */}
            <div
              aria-hidden
              data-slot="confirm-dialog-handle"
              className="mb-2.5 h-1 w-9 shrink-0 self-center rounded-full bg-border-strong @md:hidden"
            />
            <AlertDialogPrimitive.Title className="text-lg font-semibold">{title}</AlertDialogPrimitive.Title>
            {detail && (
              <AlertDialogPrimitive.Description className="text-sm leading-normal text-foreground-secondary">
                {detail}
              </AlertDialogPrimitive.Description>
            )}
            <div className="mt-3.5 flex flex-col-reverse gap-2 @md:flex-row @md:justify-end">
              {/* Outlined beside the confirm; on the sheet, under a full-width confirm, it is a plain line. */}
              <AlertDialogPrimitive.Close
                render={
                  <Button
                    variant="outline"
                    size="lg"
                    className="@max-md:border-transparent @max-md:bg-transparent @max-md:shadow-none"
                  />
                }
              >
                {cancelLabel}
              </AlertDialogPrimitive.Close>
              <Button variant="destructive" size="lg" disabled={pending} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </AlertDialogPrimitive.Popup>
        </AlertDialogPrimitive.Viewport>
      </SheetPortal>
    </AlertDialogPrimitive.Root>
  );
}

export { ConfirmDialog };
export type { ConfirmDialogProps };
