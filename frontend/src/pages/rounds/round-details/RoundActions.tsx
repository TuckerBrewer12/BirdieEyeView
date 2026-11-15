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
  deleteLine: string;
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
      <Button variant="outline" size="toolbar" onClick={onBack}>
        <ChevronLeft data-icon="inline-start" />
        Rounds
      </Button>

      {editMode ? (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="toolbar" onClick={onCancelEdit}>
            Cancel
          </Button>
          <Button size="toolbar" disabled={saving} onClick={onSave}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="toolbar-icon-phone"
            aria-label="Share"
            disabled={sharing}
            onClick={onShare}
          >
            <Share />
            <span aria-hidden className="hidden md:inline">
              Share
            </span>
          </Button>
          <Button variant="outline" size="toolbar-icon-phone" aria-label="Edit" onClick={onEdit}>
            <Pencil className="md:hidden" />
            <span aria-hidden className="hidden md:inline">
              Edit
            </span>
          </Button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger chevron={false} size="toolbar-icon" aria-label="More actions">
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
