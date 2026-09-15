import { ChevronLeft, Share2, Pencil, Trash2 } from "lucide-react";
import { Alert, AlertDescription, Button } from "@/brand";

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
 * The kit supplies the Button and Alert; the page owns the choreography.
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
      <Button variant="linkMuted" size="xs" className="h-auto gap-1 p-0 text-[13px]" onClick={onBack}>
        <ChevronLeft className="size-4" />
        Rounds
      </Button>

      <div className="flex items-center gap-2">
        {editMode ? (
          <>
            <Button size="sm" className="px-3.5 text-[13px]" disabled={saving} onClick={onSave}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="outline" size="sm" className="px-3.5 text-[13px]" onClick={onCancelEdit}>
              Cancel
            </Button>
          </>
        ) : confirmDelete ? (
          <Alert
            variant="destructive"
            className="flex w-auto items-center gap-2 bg-destructive/5 py-1.5"
          >
            <AlertDescription className="text-[13px] text-destructive">
              Delete this round?
            </AlertDescription>
            <Button
              variant="linkMuted"
              size="xs"
              className="h-auto p-0 text-[13px] font-bold text-destructive hover:text-destructive"
              disabled={deleting}
              onClick={onConfirmDelete}
            >
              {deleting ? "Deleting…" : "Yes"}
            </Button>
            <Button
              variant="linkMuted"
              size="xs"
              className="h-auto p-0 text-[13px]"
              onClick={onCancelDelete}
            >
              Cancel
            </Button>
          </Alert>
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
    </div>
  );
}
