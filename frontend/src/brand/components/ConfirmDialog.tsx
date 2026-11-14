import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { cn } from "@/brand/cn";
import { Alert, AlertDescription } from "./Alert";
import { Button } from "./Button";
import { SheetPortal } from "./Sheet";

type ConfirmDialogProps = Pick<AlertDialogPrimitive.Root.Props, "open" | "onOpenChange"> &
  Omit<AlertDialogPrimitive.Popup.Props, "title" | "children"> & {
    title: string;
    detail?: string;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
    tone?: "destructive" | "default";
    alternative?: { label: string; onClick: () => void };
    error?: string | null;
    pending?: boolean;
    contained?: boolean;
  };

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  detail,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  tone = "destructive",
  alternative,
  error,
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
            {error && (
              <Alert tone="danger" className="mt-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="mt-3.5 flex flex-col-reverse gap-2 @md:flex-row @md:justify-end">
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
              {alternative && (
                <Button variant="ghostDestructive" size="lg" disabled={pending} onClick={alternative.onClick}>
                  {alternative.label}
                </Button>
              )}
              <Button variant={tone === "default" ? "default" : "destructive"} size="lg" disabled={pending} onClick={onConfirm}>
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
