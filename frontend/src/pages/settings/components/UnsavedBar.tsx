import { Button } from "@/brand";
import { cn } from "@/brand/cn";

interface UnsavedBarProps {
  saving: boolean;
  canSave: boolean;
  onSave: () => void;
  onDiscard: () => void;
  /** Sits at the foot of its parent and shows at any width, for the preview. */
  contained?: boolean;
}

/**
 * Pinned to the foot of the window on a computer while settings have changed: "Unsaved changes",
 * Discard and Save. A phone saves from the title row instead.
 */
export function UnsavedBar({ saving, canSave, onSave, onDiscard, contained = false }: UnsavedBarProps) {
  return (
    <div
      data-slot="unsaved-bar"
      className={cn(
        "inset-x-0 bottom-0 z-20 border-t border-border bg-card shadow-hairline",
        contained ? "absolute" : "fixed hidden md:left-rail md:block",
      )}
    >
      <div className={cn("flex max-w-2xl items-center gap-2 py-3", contained ? "px-4" : "box-content px-11")}>
        <span className="flex-1 text-sm text-foreground-secondary">Unsaved changes</span>
        <Button variant="ghost" onClick={onDiscard} disabled={saving}>
          Discard
        </Button>
        <Button onClick={onSave} disabled={!canSave}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
