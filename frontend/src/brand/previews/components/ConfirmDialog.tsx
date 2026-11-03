import { ConfirmDialog } from "@/brand/components/ConfirmDialog";

export default function ConfirmDialogPreview() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="text-label font-semibold text-muted-foreground">
          Desktop · centered
        </div>
        <div className="relative h-80 overflow-hidden rounded-xl bg-border">
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

      <div className="flex flex-col gap-2">
        <div className="text-label font-semibold text-muted-foreground">
          Mobile · from the bottom
        </div>
        <div className="relative h-88 w-75 overflow-hidden rounded-2xl bg-border">
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
    </>
  );
}
