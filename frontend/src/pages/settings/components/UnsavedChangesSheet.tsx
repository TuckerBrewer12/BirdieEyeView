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
  error: string | null;
  onSave: () => void;
  onDiscard: () => void;
  onStay: () => void;
  contained?: boolean;
}

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
            <Alert variant="destructive">
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
