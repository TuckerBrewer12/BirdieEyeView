import { Ellipsis } from "lucide-react";
import { Button } from "@/brand/components/Button";

const rows = [
  { name: "Primary", label: "Save", variant: "default" },
  { name: "Secondary", label: "Cancel", variant: "outline" },
  { name: "Text", label: "Edit", variant: "link" },
  { name: "Danger", label: "Delete", variant: "destructive" },
] as const;

const grid = "grid grid-cols-[4.5rem_repeat(2,minmax(0,1fr))] items-center gap-2";

export default function ButtonPreview() {
  return (
    <div className="flex flex-col gap-2.5 rounded-card border border-border bg-card p-4.5 text-foreground">
      <div className={`${grid} text-label font-semibold text-muted-foreground`}>
        <div />
        <div>Default</div>
        <div>Disabled</div>
      </div>
      {rows.map((row) => (
        <div key={row.name} className={grid}>
          <div className="text-body-sm text-foreground-secondary">{row.name}</div>
          <Button variant={row.variant}>{row.label}</Button>
          <Button variant={row.variant} disabled>
            {row.label}
          </Button>
        </div>
      ))}
      <div className="my-1 h-px bg-border" />
      <div className="text-label font-semibold text-muted-foreground">Sizes · 48 / 40 / 32</div>
      <div className="flex items-center gap-2">
        <Button size="lg">Save round</Button>
        <Button>Save</Button>
        <Button size="sm">Link</Button>
        <Button variant="outline" size="icon" aria-label="More options">
          <Ellipsis />
        </Button>
      </div>
    </div>
  );
}
