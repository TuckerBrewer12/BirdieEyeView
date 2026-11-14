import { ActionBar } from "@/brand/components/ActionBar";
import { Button } from "@/brand/components/Button";

export default function ActionBarPreview() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-body text-muted-foreground">In line from md; pinned above the tab bar on a phone.</p>
        <ActionBar>
          <Button variant="outline">Start over</Button>
          <Button className="flex-1 md:flex-none">Save round</Button>
        </ActionBar>
      </div>
      {/* Pinned at every width, held at the foot of this box rather than the window. */}
      <div className="relative h-24 overflow-hidden rounded-xl bg-background ring-1 ring-border">
        <ActionBar pinned="always" className="absolute bottom-0 md:left-0 md:px-4">
          <span className="flex-1 text-body text-muted-foreground">Unsaved changes</span>
          <Button variant="ghost">Discard</Button>
          <Button>Save</Button>
        </ActionBar>
      </div>
    </div>
  );
}
