import { UnsavedBar } from "../components/UnsavedBar";

const noop = () => {};

/** Pinned to the foot of its box here; on the page it pins to the window's, from `md`. */
export default function UnsavedBarPreview() {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-24 overflow-hidden rounded-xl bg-background ring-1 ring-border">
        <UnsavedBar contained saving={false} canSave onSave={noop} onDiscard={noop} />
      </div>
      <div className="relative h-24 overflow-hidden rounded-xl bg-background ring-1 ring-border">
        <UnsavedBar contained saving canSave={false} onSave={noop} onDiscard={noop} />
      </div>
    </div>
  );
}
