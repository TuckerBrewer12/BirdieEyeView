import { Ellipsis } from "lucide-react";
import { Button } from "@/brand/components/Button";
import { cn } from "@/brand/cn";

const rows = [
  { name: "Primary", label: "Save", variant: "default" },
  { name: "Secondary", label: "Cancel", variant: "outline" },
  { name: "Text", label: "Edit", variant: "link" },
  { name: "Danger", label: "Delete", variant: "destructive" },
] as const;

const grid = "grid grid-cols-state-grid items-center gap-2";

/** One theme's panel of the board: every variant in each state, then the sizes. */
function Panel({ theme }: { theme: "Light" | "Dark" }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-xl border border-border bg-card p-4.5 text-foreground",
        theme === "Dark" && "dark",
      )}
    >
      <div className={cn(grid, "text-label font-semibold text-muted-foreground")}>
        <div>{theme}</div>
        <div>Default</div>
        <div>Hover</div>
        <div>Disabled</div>
      </div>
      {rows.map((row) => (
        <div key={row.name} className={grid}>
          <div className="text-body-sm text-foreground-secondary">{row.name}</div>
          <Button variant={row.variant} className="px-1.5">
            {row.label}
          </Button>
          <Button variant={row.variant} className="px-1.5" data-hover="">
            {row.label}
          </Button>
          <Button variant={row.variant} className="px-1.5" disabled>
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

/** The canvas board: the light and dark panels side by side, at the board's size. */
export default function ButtonPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 grid grid-cols-2 gap-4 bg-background p-6">
      <Panel theme="Light" />
      <Panel theme="Dark" />
    </div>
  );
}
