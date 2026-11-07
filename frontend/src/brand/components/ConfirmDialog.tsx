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
 * button.
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
              "flex w-full flex-col gap-1.5 rounded-t-sheet bg-card px-5 py-6 text-card-foreground outline-none transition duration-200 ease-out data-ending-style:translate-y-full data-ending-style:opacity-0 data-starting-style:translate-y-full data-starting-style:opacity-0",
              "@md:m-auto @md:max-w-sm @md:gap-2 @md:rounded-2xl @md:p-6 @md:shadow-lg @md:data-ending-style:translate-y-0 @md:data-ending-style:scale-95 @md:data-starting-style:translate-y-0 @md:data-starting-style:scale-95",
              className,
            )}
            {...props}
          >
            <AlertDialogPrimitive.Title className="text-lg font-bold">{title}</AlertDialogPrimitive.Title>
            {detail && (
              <AlertDialogPrimitive.Description className="text-sm text-foreground-secondary">
                {detail}
              </AlertDialogPrimitive.Description>
            )}
            <div className="mt-3 flex flex-col-reverse gap-2 @md:flex-row @md:justify-end">
              <AlertDialogPrimitive.Close render={<Button variant="outline" size="lg" />}>
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
