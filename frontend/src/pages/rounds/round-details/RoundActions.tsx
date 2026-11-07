import { ChevronLeft, Share2, Pencil, Trash2 } from "lucide-react";
import { Button, ConfirmDialog } from "@/brand";

export interface RoundActionsProps {
  editMode: boolean;
  saving: boolean;
  confirmDelete: boolean;
  deleting: boolean;
  sharing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onBack: () => void;
}

/**
 * The toolbar above a round: back, and whichever of edit / share / delete the
 * current mode allows.
 *
 * This lives with the page rather than in the kit because it is all intent and
 * no data — eight callbacks and five flags, none of which describe a round.
 * The kit supplies the Button and ConfirmDialog; the page owns the choreography.
 */
export function RoundActions({
  editMode,
  saving,
  confirmDelete,
  deleting,
  sharing,
  onEdit,
  onSave,
  onCancelEdit,
  onShare,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  onBack,
}: RoundActionsProps) {
  return (
    <div data-slot="round-actions" className="flex items-center justify-between py-1 pb-3">
      <Button variant="linkMuted" size="xs" className="h-auto gap-1 p-0 text-body" onClick={onBack}>
        <ChevronLeft className="size-4" />
        Rounds
      </Button>

      <div className="flex items-center gap-2">
        {editMode ? (
          <>
            <Button size="sm" className="px-3.5 text-body" disabled={saving} onClick={onSave}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="outline" size="sm" className="px-3.5 text-body" onClick={onCancelEdit}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="icon" className="rounded-full" title="Share" aria-label="Share" disabled={sharing} onClick={onShare}>
              <Share2 />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full" title="Edit" aria-label="Edit" onClick={onEdit}>
              <Pencil />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full text-destructive" title="Delete" aria-label="Delete" onClick={onDelete}>
              <Trash2 />
            </Button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!open) onCancelDelete();
        }}
        title="Delete this round?"
        detail="This can’t be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete round"}
        pending={deleting}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
