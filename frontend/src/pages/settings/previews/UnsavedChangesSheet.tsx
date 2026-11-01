import { UnsavedChangesSheet } from "../components/UnsavedChangesSheet";

const noop = () => {};

export default function UnsavedChangesSheetPreview() {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-preview overflow-hidden rounded-xl bg-muted ring-1 ring-border">
        <UnsavedChangesSheet open contained saving={false} error={null} onSave={noop} onDiscard={noop} onStay={noop} />
      </div>
      <div className="relative h-preview overflow-hidden rounded-xl bg-muted ring-1 ring-border">
        <UnsavedChangesSheet
          open
          contained
          saving={false}
          error="Selected home course was not found"
          onSave={noop}
          onDiscard={noop}
          onStay={noop}
        />
      </div>
    </div>
  );
}
