import { ConfirmDialog } from "@/brand/components/ConfirmDialog";

/**
 * The board's two layouts side by side, so the preview fills the window
 * instead of the 390px stage; capture it at 900 x 420.
 */
export default function ConfirmDialogPreview() {
  return (
    <div
      data-testid="brand-frame"
      className="fixed inset-0 flex gap-6 overflow-hidden bg-background p-6"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="text-label font-semibold text-muted-foreground">
          Desktop · centered
        </div>
        <div className="relative flex-1 overflow-hidden rounded-xl bg-border">
          <ConfirmDialog
            defaultOpen
            contained
            placement="center"
            initialFocus={false}
            title="Delete this round?"
            detail="Half Moon Bay · Jun 15 · 78. This can’t be undone."
            confirmLabel="Delete round"
            destructive
          />
        </div>
      </div>

      <div className="flex w-75 flex-col gap-2">
        <div className="text-label font-semibold text-muted-foreground">
          Mobile · from the bottom
        </div>
        <div className="relative flex-1 overflow-hidden rounded-2xl bg-border">
          <ConfirmDialog
            defaultOpen
            contained
            placement="bottom"
            initialFocus={false}
            title="Delete this round?"
            detail="Half Moon Bay · Jun 15 · 78"
            confirmLabel="Delete round"
            destructive
          />
        </div>
      </div>
    </div>
  );
}
