import { ActionBar } from "@/brand/components/ActionBar";
import { Button } from "@/brand/components/Button";

export default function ActionBarPreview() {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-body text-muted-foreground">In line from md; pinned above the tab bar on a phone.</p>
      <ActionBar>
        <Button variant="outline">Start over</Button>
        <Button className="flex-1 md:flex-none">Save round</Button>
      </ActionBar>
    </div>
  );
}
