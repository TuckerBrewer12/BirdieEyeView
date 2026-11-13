import type { ReactNode } from "react";
import { ConfirmDialog } from "@/brand/components/ConfirmDialog";

const noop = () => {};

function Panel({ label, wide, children }: { label: string; wide: boolean; children: ReactNode }) {
  return (
    <div className={wide ? "flex min-w-0 flex-1 flex-col gap-2" : "flex w-75 flex-col gap-2"}>
      <div className="text-label font-semibold text-muted-foreground">{label}</div>
      <div className={wide ? "relative flex-1 overflow-hidden rounded-xl bg-border" : "relative flex-1 overflow-hidden rounded-2xl bg-border"}>
        {children}
      </div>
    </div>
  );
}

/**
 * The board's two layouts side by side: the same dialog in a wide box
 * centres, in a phone-wide one rises from the bottom. The top row asks before
 * a delete; the bottom row asks before leaving unsaved changes, with a second
 * way through and a failed save. It fills the window instead of the 390px
 * stage; capture it at 900 x 840.
 */
export default function ConfirmDialogPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 flex flex-col gap-6 overflow-hidden bg-background p-6">
      <div className="flex min-h-0 flex-1 gap-6">
        <Panel label="Desktop · centered" wide>
          <ConfirmDialog
            open
            onConfirm={noop}
            contained
            initialFocus={false}
            title="Delete this round?"
            detail="Half Moon Bay · Jun 15 · 78. Your stats and handicap will update. This can’t be undone."
            confirmLabel="Delete round"
          />
        </Panel>
        <Panel label="Mobile · from the bottom" wide={false}>
          <ConfirmDialog
            open
            onConfirm={noop}
            contained
            initialFocus={false}
            title="Delete this round?"
            detail="Half Moon Bay · Jun 15 · 78. Your stats and handicap will update."
            confirmLabel="Delete round"
          />
        </Panel>
      </div>
      <div className="flex min-h-0 flex-1 gap-6">
        <Panel label="Desktop · a second way through" wide>
          <ConfirmDialog
            open
            onConfirm={noop}
            contained
            initialFocus={false}
            title="Save changes before leaving?"
            tone="default"
            confirmLabel="Save"
            alternative={{ label: "Discard", onClick: noop }}
            cancelLabel="Keep editing"
          />
        </Panel>
        <Panel label="Mobile · with an error" wide={false}>
          <ConfirmDialog
            open
            onConfirm={noop}
            contained
            initialFocus={false}
            title="Save changes before leaving?"
            tone="default"
            confirmLabel="Save"
            alternative={{ label: "Discard", onClick: noop }}
            cancelLabel="Keep editing"
            error="Selected home course was not found"
          />
        </Panel>
      </div>
    </div>
  );
}
