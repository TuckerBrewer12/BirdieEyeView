import { ChevronLeft, Link2, MoreHorizontal, Pencil, Share, Trash2 } from "lucide-react";
import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/brand";

export interface RoundActionsProps {
  editMode: boolean;
  saving: boolean;
  confirmDelete: boolean;
  deleting: boolean;
  sharing: boolean;
  /** The round as the delete dialog names it: "Half Moon Bay · Jun 15 · 78". */
  deleteLine: string;
  /** Offers "Link to a course" in the More menu, for a round with no course behind it. */
  canLink: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onShare: () => void;
  onLink: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onBack: () => void;
}

/**
 * The bar above a round: back to the list, then Share, Edit and More (which holds Delete), or Cancel
 * and Save while editing. On a phone Share and Edit are icons alone.
 *
 * This lives with the page rather than in the kit because it is all intent and no data: callbacks
 * and flags, none of which describe a round. The kit supplies the Button, the menu and the dialog.
 */
export function RoundActions({
  editMode,
  saving,
  confirmDelete,
  deleting,
  sharing,
  deleteLine,
  canLink,
  onEdit,
  onSave,
  onCancelEdit,
  onShare,
  onLink,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  onBack,
}: RoundActionsProps) {
  return (
    <div data-slot="round-actions" className="flex items-center justify-between gap-3">
      <Button variant="outline" className="h-11 gap-1 rounded-xl pr-4 pl-2.5 text-body-lg md:text-sm" onClick={onBack}>
        <ChevronLeft className="size-4" />
        Rounds
      </Button>

      {editMode ? (
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="h-11 rounded-xl px-4" onClick={onCancelEdit}>
            Cancel
          </Button>
          <Button className="h-11 rounded-xl px-6" disabled={saving} onClick={onSave}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="size-11 rounded-xl p-0 md:w-auto md:px-5"
            aria-label="Share"
            disabled={sharing}
            onClick={onShare}
          >
            <Share />
            <span aria-hidden className="hidden md:inline">
              Share
            </span>
          </Button>
          <Button variant="outline" className="size-11 rounded-xl p-0 md:w-auto md:px-5" aria-label="Edit" onClick={onEdit}>
            <Pencil className="md:hidden" />
            <span aria-hidden className="hidden md:inline">
              Edit
            </span>
          </Button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger chevron={false} className="size-11 rounded-xl p-0" aria-label="More actions">
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {canLink && (
                <DropdownMenuItem onClick={onLink}>
                  <Link2 />
                  Link to a course
                </DropdownMenuItem>
              )}
              <DropdownMenuItem destructive onClick={onDelete}>
                <Trash2 />
                Delete round
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!open) onCancelDelete();
        }}
        title="Delete this round?"
        detail={`${deleteLine}. Your stats and handicap will update. This can’t be undone.`}
        confirmLabel={deleting ? "Deleting…" : "Delete round"}
        pending={deleting}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
