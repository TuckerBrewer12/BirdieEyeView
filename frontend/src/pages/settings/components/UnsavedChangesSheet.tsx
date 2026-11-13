import {
  Alert,
  AlertDescription,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/brand";

interface UnsavedChangesSheetProps {
  open: boolean;
  saving: boolean;
  /** Why the last save failed, or null. */
  error: string | null;
  onSave: () => void;
  onDiscard: () => void;
  /** Closing the sheet keeps the player on the page. */
  onStay: () => void;
  /** Hosts the sheet in its parent instead of over the page, for the preview. */
  contained?: boolean;
}

/** Asks what to do with unsaved settings when the player heads off the page. */
export function UnsavedChangesSheet({
  open,
  saving,
  error,
  onSave,
  onDiscard,
  onStay,
  contained = false,
}: UnsavedChangesSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onStay();
      }}
      modal={!contained}
    >
      <SheetContent contained={contained} initialFocus={contained ? false : undefined}>
        <SheetHeader>
          <SheetTitle>Unsaved changes</SheetTitle>
          <SheetDescription>
            You changed your settings without saving them. Save them before you go, or discard them.
          </SheetDescription>
        </SheetHeader>
        {error && (
          <div className="p-4">
            <Alert tone="danger">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}
        <SheetFooter>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save and leave"}
          </Button>
          <Button variant="outline" onClick={onDiscard} disabled={saving}>
            Discard changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
