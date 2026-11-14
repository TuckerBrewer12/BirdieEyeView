import { ChevronDown } from "lucide-react";
import { Button } from "@/brand/components/Button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/brand/components/Collapsible";

function Panel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted px-3 py-4 text-sm text-muted-foreground">{label}</div>
  );
}

function Example({ label, defaultOpen }: { label: string; defaultOpen: boolean }) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="flex flex-col gap-2">
      <CollapsibleTrigger render={<Button variant="ghost" className="justify-between" />}>
        {label}
        <ChevronDown className="in-data-panel-open:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Panel label="Revealed content" />
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function CollapsiblePreview() {
  return (
    <>
      <Example label="Open by default" defaultOpen />
      <Example label="Closed by default" defaultOpen={false} />
    </>
  );
}
